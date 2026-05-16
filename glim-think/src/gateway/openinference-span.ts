/**
 * OpenInference labelling for the legacy gateway provider spans.
 *
 * The Vercel OI projector (telemetry/openinference.ts) only rewrites Vercel
 * AI SDK spans (ai.generateText…). The real research LLM calls go through
 * this gateway (gateway.minimax / .zai / .huggingface / …) as hand-rolled
 * spans carrying only gen_ai.* transport attrs — so Phoenix can't classify
 * them as LLM, shows no labelled input/output (unlike the OpenInference demo
 * projects), and the eval harness can't score real research output.
 *
 * This stamps the OpenInference conventions directly at span creation:
 * span.kind=LLM, input/output value + structured llm.input_messages /
 * llm.output_messages (Phoenix renders the latter as the chat transcript),
 * model, provider, token counts.
 */

import { type Span } from "@opentelemetry/api";
import {
  SemanticConventions as SC,
  OpenInferenceSpanKind,
  MimeType,
} from "@arizeai/openinference-semantic-conventions";

export function annotateGatewayLLMSpan(
  span: Span,
  args: {
    provider: string;
    model: string;
    systemPrompt?: string;
    prompt: string;
    outputText: string;
    usage?: { promptTokens: number; completionTokens: number };
  },
): void {
  span.setAttribute(SC.OPENINFERENCE_SPAN_KIND, OpenInferenceSpanKind.LLM);
  span.setAttribute(SC.LLM_PROVIDER, args.provider);
  span.setAttribute(SC.LLM_MODEL_NAME, args.model);

  const messages: Array<{ role: string; content: string }> = [];
  if (args.systemPrompt) messages.push({ role: "system", content: args.systemPrompt });
  messages.push({ role: "user", content: args.prompt });

  span.setAttribute(SC.INPUT_VALUE, JSON.stringify({ messages }));
  span.setAttribute(SC.INPUT_MIME_TYPE, MimeType.JSON);
  span.setAttribute(SC.OUTPUT_VALUE, args.outputText);
  span.setAttribute(SC.OUTPUT_MIME_TYPE, MimeType.TEXT);

  // Structured messages → Phoenix renders these as the chat transcript view,
  // matching the OpenInference demo projects.
  messages.forEach((m, i) => {
    span.setAttribute(`${SC.LLM_INPUT_MESSAGES}.${i}.${SC.MESSAGE_ROLE}`, m.role);
    span.setAttribute(`${SC.LLM_INPUT_MESSAGES}.${i}.${SC.MESSAGE_CONTENT}`, m.content);
  });
  span.setAttribute(`${SC.LLM_OUTPUT_MESSAGES}.0.${SC.MESSAGE_ROLE}`, "assistant");
  span.setAttribute(`${SC.LLM_OUTPUT_MESSAGES}.0.${SC.MESSAGE_CONTENT}`, args.outputText);

  if (args.usage) {
    const p = args.usage.promptTokens ?? 0;
    const c = args.usage.completionTokens ?? 0;
    span.setAttribute(SC.LLM_TOKEN_COUNT_PROMPT, p);
    span.setAttribute(SC.LLM_TOKEN_COUNT_COMPLETION, c);
    span.setAttribute(SC.LLM_TOKEN_COUNT_TOTAL, p + c);
  }
}
