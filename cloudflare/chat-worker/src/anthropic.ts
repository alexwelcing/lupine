// ═══════════════════════════════════════════════════════════════════
// anthropic.ts — the server-side Claude tool-use loop.
//
// Mirrors the raw-HTTP call style used elsewhere in this repo (glim-think
// hand-rolls fetch() against the provider's REST endpoint) but targets the
// Anthropic Messages API with its documented auth headers (x-api-key +
// anthropic-version), since glim-think itself routes Claude only via the
// AI Gateway and exposes no live Anthropic model id to reuse.
//
// Model id: `claude-sonnet-4-6` — the current production-balanced model
// from the `anthropic-api` skill's references/models.md (200K context,
// tool use, $3/$15 MTok). Override per-deploy via env.ANTHROPIC_MODEL.
//
// Two server-side tools are exposed to Claude:
//   1. search_catalog     — executed here against the request's catalog
//   2. apply_configuration — the model's channel to emit final MCP actions
//
// Loop: call Anthropic → if it asks for search_catalog, run it and feed the
// tool_result back → call again. If it calls apply_configuration, capture the
// actions and finish. Otherwise return the assistant text as a clarifying
// `reply`.
// ═══════════════════════════════════════════════════════════════════

import { searchCatalog } from "./catalog";
import type {
  CatalogEntry,
  ChatMessage,
  ChatResponseBody,
  McpRequest,
  ViewerState,
} from "./types";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/**
 * Default Claude model id. Sourced from the anthropic-api skill's
 * references/models.md (current 2026 production-balanced model). NOT
 * invented; override via env.ANTHROPIC_MODEL without a code change.
 */
export const DEFAULT_MODEL = "claude-sonnet-4-6";

const MAX_TOKENS = 1024;
/** Safety bound on the tool-use loop so a misbehaving model can't spin. */
const MAX_TURNS = 6;

// ─── Anthropic Messages API wire types (minimal subset) ───

interface AnthropicTextBlock {
  type: "text";
  text: string;
}
interface AnthropicToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}
type AnthropicContentBlock = AnthropicTextBlock | AnthropicToolUseBlock;

interface AnthropicToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

interface AnthropicMessageParam {
  role: "user" | "assistant";
  content: string | Array<AnthropicContentBlock | AnthropicToolResultBlock>;
}

interface AnthropicResponse {
  role: "assistant";
  content: AnthropicContentBlock[];
  stop_reason: "end_turn" | "max_tokens" | "stop_sequence" | "tool_use" | string;
}

interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// ─── System prompt: how Claude should drive the configuration dialog ───

const SYSTEM_PROMPT = `You are LUPI, a concise, friendly molecular-visualization assistant on the home page of a 3D molecular viewer. Your job is to help a visitor pick a molecule and configure how it is displayed, then load + configure it in the viewer.

You have two tools:
- search_catalog(query, elements?) — find the molecule the user means from the site's catalog. ALWAYS use this to confirm the exact molecule before configuring. Pass element symbols (e.g. ["Fe","O"]) in "elements" when the user names them.
- apply_configuration(molecule_id?, actions, done) — emit the final viewer commands. Call this ONLY when you have enough to load and configure the molecule.

Conversation rules:
1. First, identify the molecule the user wants and confirm it via search_catalog. If several match, briefly offer the top option(s).
2. Then INTERROGATE the user about the three configuration dimensions, ONE concise question per turn (never more than one question in a single reply):
   a. lattice / supercell size — e.g. a single cell (1x1x1) vs a 3x3x3 supercell.
   b. coloring — color by element, or by a property/scheme.
   c. bonds — show bonds? and if so, how tolerant should bond detection be.
3. Keep every reply short, scientific, and friendly. If the user is vague or says "you pick" / "defaults", choose sensible defaults and proceed — do not keep asking.
4. When you have enough information, call apply_configuration with:
   - one "lupi.generate_molecule" action to LOAD the molecule, and
   - one "lupi.set_viewer" action to CONFIGURE it (coloring, bonds, lattice replication, etc.),
   then set done=true.

Action shapes you MUST follow:
- lupi.generate_molecule arguments: { inputType: "name"|"template"|"procedural", input: string, atomCount?: number, element?: string, elements?: string[], lattice?: "sc"|"bcc"|"fcc", viewer?: ViewerPatch }. For a catalog molecule use inputType:"name" and input set to the molecule title (or formula).
- lupi.set_viewer arguments (ViewerPatch): { showBonds?: boolean, atomScale?: number, colorScheme?: "element"|"property"|"family"|"botanical"|"uniform", colorProperty?: string, colormap?: string, cameraPreset?: string, postprocessPreset?: string, bondTolerance?: number, bondColorMode?: "type"|"length"|"energy"|"screening", latticeReplication?: [number,number,number] }.
- Each action needs a short unique "id" (e.g. "load", "config") and a "tool" set to one of the two MCP tool names above.

Sensible defaults when the user defers: latticeReplication [1,1,1], colorScheme "element", showBonds true with bondTolerance 0.45.

Always ground the molecule choice in search_catalog results; never invent a catalog id. Reply in plain prose (no markdown headers).`;

// ─── Tool definitions sent to Claude ───

const TOOLS: AnthropicToolDef[] = [
  {
    name: "search_catalog",
    description:
      "Search the site's molecule catalog for entries matching the user's words. Returns up to 5 candidates with id, title, formula, elements, and domain. Use this to confirm the exact molecule before configuring.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Free-text description of the molecule (name, formula, or words the user used).",
        },
        elements: {
          type: "array",
          items: { type: "string" },
          description: "Optional element symbols to bias the search, e.g. [\"Fe\",\"O\"].",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "apply_configuration",
    description:
      "Emit the final MCP actions for the client to execute against the viewer. Call this once you have enough information to load AND configure the molecule.",
    input_schema: {
      type: "object",
      properties: {
        molecule_id: {
          type: "string",
          description: "The chosen catalog molecule id (from search_catalog results), if any.",
        },
        actions: {
          type: "array",
          description:
            "Ordered MCP requests. Typically one lupi.generate_molecule (load) followed by one lupi.set_viewer (configure).",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "Short unique id for this action." },
              tool: {
                type: "string",
                enum: ["lupi.generate_molecule", "lupi.set_viewer"],
              },
              arguments: { type: "object", description: "Tool-specific arguments." },
            },
            required: ["id", "tool", "arguments"],
          },
        },
        done: {
          type: "boolean",
          description: "True when configuration is complete and the molecule is loaded+configured.",
        },
      },
      required: ["actions", "done"],
    },
  },
];

// ─── Public entry point ───

export interface RunChatInput {
  messages: ChatMessage[];
  viewer: ViewerState;
  catalog: CatalogEntry[];
}

/**
 * Run the Anthropic tool-use loop and return the public chat response.
 * Throws on transport / API errors; the caller maps those to HTTP 5xx.
 */
export async function runChat(
  env: { ANTHROPIC_API_KEY: string; ANTHROPIC_MODEL?: string },
  input: RunChatInput,
): Promise<ChatResponseBody> {
  const model = env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;

  // Seed the conversation with the client transcript, prefixed by a compact
  // snapshot of the current viewer state so the model knows where it stands.
  const convo: AnthropicMessageParam[] = [
    {
      role: "user",
      content:
        `Current viewer state: ${JSON.stringify(input.viewer)}.\n` +
        `Catalog size: ${input.catalog.length} molecules.\n` +
        `Begin/continue the conversation based on the messages that follow.`,
    },
    { role: "assistant", content: "Understood — I'll help configure the viewer." },
    ...input.messages.map((m): AnthropicMessageParam => ({
      role: m.role,
      content: m.content,
    })),
  ];

  // The Anthropic Messages API requires the final message to be from the
  // user. If the client's transcript ends on an assistant turn (e.g. a
  // pre-seeded greeting), append a nudge so the API has a user turn to answer.
  if (convo[convo.length - 1]?.role === "assistant") {
    convo.push({ role: "user", content: "Please continue." });
  }

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await callAnthropic(env.ANTHROPIC_API_KEY, model, convo);

    const toolUses = res.content.filter(
      (b): b is AnthropicToolUseBlock => b.type === "tool_use",
    );

    // No tool call → the assistant is asking a clarifying question / replying.
    if (res.stop_reason !== "tool_use" || toolUses.length === 0) {
      return { reply: collectText(res.content) || "How would you like to configure it?" };
    }

    // If the model decided to finalize, honor apply_configuration immediately.
    const finalize = toolUses.find((t) => t.name === "apply_configuration");
    if (finalize) {
      return buildFinalResponse(finalize, collectText(res.content));
    }

    // Otherwise execute the requested (search_catalog) tools and loop.
    const toolResults: AnthropicToolResultBlock[] = toolUses.map((tu) =>
      executeServerTool(tu, input.catalog),
    );

    convo.push({ role: "assistant", content: res.content });
    convo.push({ role: "user", content: toolResults });
  }

  // Loop guard exhausted — return a graceful clarifying prompt.
  return {
    reply:
      "Let's narrow it down — which molecule would you like to view, and how should I color it?",
  };
}

// ─── Helpers ───

function collectText(blocks: AnthropicContentBlock[]): string {
  return blocks
    .filter((b): b is AnthropicTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Execute a server-side tool and shape the result as a tool_result block. */
function executeServerTool(
  tu: AnthropicToolUseBlock,
  catalog: CatalogEntry[],
): AnthropicToolResultBlock {
  if (tu.name === "search_catalog") {
    const query = typeof tu.input.query === "string" ? tu.input.query : "";
    const elements = Array.isArray(tu.input.elements)
      ? (tu.input.elements.filter((e) => typeof e === "string") as string[])
      : undefined;
    const hits = searchCatalog(catalog, { query, elements });
    return {
      type: "tool_result",
      tool_use_id: tu.id,
      content: JSON.stringify({ results: hits }),
    };
  }
  // Unknown tool — report an error result so the model can recover.
  return {
    type: "tool_result",
    tool_use_id: tu.id,
    content: JSON.stringify({ error: `Unknown tool: ${tu.name}` }),
    is_error: true,
  };
}

/** Map an apply_configuration tool call into the public ChatResponseBody. */
function buildFinalResponse(
  finalize: AnthropicToolUseBlock,
  trailingText: string,
): ChatResponseBody {
  const input = finalize.input as {
    molecule_id?: unknown;
    actions?: unknown;
    done?: unknown;
  };

  const actions = sanitizeActions(input.actions);
  const done = input.done === true;

  let molecule: { id: string; title: string } | null = null;
  if (typeof input.molecule_id === "string" && input.molecule_id.trim()) {
    molecule = {
      id: input.molecule_id,
      title: titleFromActions(actions, input.molecule_id),
    };
  }

  const reply =
    trailingText ||
    (done
      ? "Done — I've loaded and configured the molecule in the viewer."
      : "Here's the configuration.");

  const body: ChatResponseBody = { reply, actions, done };
  if (molecule) body.molecule = molecule;
  return body;
}

/** Validate/normalize the model-emitted actions into well-formed McpRequests. */
function sanitizeActions(raw: unknown): McpRequest[] {
  if (!Array.isArray(raw)) return [];
  const out: McpRequest[] = [];
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i] as Record<string, unknown> | null;
    if (!a || typeof a !== "object") continue;
    const tool = a.tool;
    if (tool !== "lupi.generate_molecule" && tool !== "lupi.set_viewer") continue;
    const args =
      a.arguments && typeof a.arguments === "object"
        ? (a.arguments as Record<string, unknown>)
        : {};
    const id = typeof a.id === "string" && a.id.trim() ? a.id : `action-${i + 1}`;
    out.push({ id, tool, arguments: args });
  }
  return out;
}

/** Best-effort molecule title: the generate_molecule input, else the id. */
function titleFromActions(actions: McpRequest[], fallbackId: string): string {
  const gen = actions.find((a) => a.tool === "lupi.generate_molecule");
  const input = gen?.arguments?.input;
  return typeof input === "string" && input.trim() ? input : fallbackId;
}

/** POST a single turn to the Anthropic Messages API. */
async function callAnthropic(
  apiKey: string,
  model: string,
  messages: AnthropicMessageParam[],
): Promise<AnthropicResponse> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 500)}`);
  }

  return (await res.json()) as AnthropicResponse;
}
