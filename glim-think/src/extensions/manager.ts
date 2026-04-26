/**
 * ExtensionManager: agents write their own tools at runtime.
 */

export interface Extension {
  name: string;
  description: string;
  code: string;
  permissions: string[];
  version: number;
  createdAt: string;
}

export class ExtensionManager implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private started = false;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async ensureStarted() {
    if (this.started) return;
    this.started = true;
    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS extensions (
        name TEXT PRIMARY KEY,
        description TEXT,
        code TEXT,
        permissions TEXT,
        version INTEGER,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureStarted();
    const url = new URL(request.url);

    if (url.pathname === "/ext/register" && request.method === "POST") {
      const body = await request.json() as Extension;
      const result = await this.register(body);
      return Response.json(result);
    }
    if (url.pathname === "/ext/list") {
      const list = await this.list();
      return Response.json({ extensions: list });
    }
    if (url.pathname === "/ext/run" && request.method === "POST") {
      const body = await request.json() as { name: string; input: Record<string, unknown> };
      const result = await this.execute(body.name, body.input);
      return Response.json(result);
    }
    return new Response("Not found", { status: 404 });
  }

  async register(ext: Extension): Promise<{ success: boolean; name: string; error?: string }> {
    try {
      if (/eval\s*\(|Function\s*\(|import\s*\(/.test(ext.code)) {
        return { success: false, name: ext.name, error: "Code contains forbidden patterns" };
      }

      this.state.storage.sql.exec(
        `INSERT INTO extensions (name, description, code, permissions, version, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(name) DO UPDATE SET
           description = excluded.description,
           code = excluded.code,
           permissions = excluded.permissions,
           version = excluded.version + 1,
           created_at = excluded.created_at`,
        ext.name, ext.description, ext.code, JSON.stringify(ext.permissions), ext.version
      );

      await this.env.CONFIG.put(`ext:${ext.name}`, JSON.stringify(ext));
      return { success: true, name: ext.name };
    } catch (e) {
      return { success: false, name: ext.name, error: String(e) };
    }
  }

  async list(): Promise<Extension[]> {
    const cursor = this.state.storage.sql.exec(`SELECT * FROM extensions ORDER BY created_at DESC`);
    return cursor.toArray().map((r) => ({
      name: r.name as string,
      description: r.description as string,
      code: r.code as string,
      permissions: JSON.parse(r.permissions as string),
      version: r.version as number,
      createdAt: r.created_at as string,
    }));
  }

  async execute(name: string, input: Record<string, unknown>): Promise<{ success: boolean; output?: unknown; error?: string }> {
    const cursor = this.state.storage.sql.exec(`SELECT code, permissions FROM extensions WHERE name = ?`, name);
    const rows = cursor.toArray();
    if (rows.length === 0) return { success: false, error: `Extension '${name}' not found` };

    const code = rows[0].code as string;
    const permissions = JSON.parse(rows[0].permissions as string) as string[];

    try {
      const fn = new Function("input", "ctx", `"use strict";\n${code}\nreturn main(input, ctx);`);
      const ctx = this.buildCtx(permissions);
      const output = fn(input, ctx);
      return { success: true, output };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  }

  private buildCtx(permissions: string[]) {
    const ctx: Record<string, unknown> = {};
    if (permissions.includes("math")) {
      ctx.math = Math;
    }
    if (permissions.includes("ledger:read")) {
      ctx.query = async (sql: string) => {
        const res = await this.env.LEDGER.prepare(sql).all();
        return res.results;
      };
    }
    if (permissions.includes("http")) {
      ctx.fetch = (url: string, init?: RequestInit) => fetch(url, init);
    }
    return ctx;
  }
}
