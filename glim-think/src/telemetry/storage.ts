/**
 * OpenTelemetry tracing wrappers for Cloudflare Workers storage bindings.
 *
 * Use `traceD1(env.LEDGER)`, `traceKV(env.CONFIG)`, and `traceR2(env.ARTIFACTS)`
 * to get drop-in replacements that auto-emit spans for every operation.
 *
 * Example:
 *   const db = traceD1(env.LEDGER);
 *   const rows = await db.prepare("SELECT * FROM records WHERE id = ?").bind(id).all();
 */

import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";

const STORAGE_TRACER_NAME = "glim-think.storage";

// ─── D1 ───

function tracedD1Statement(stmt: D1PreparedStatement, sql: string): D1PreparedStatement {
  const tracer = trace.getTracer(STORAGE_TRACER_NAME);
  return new Proxy(stmt, {
    get(target, prop) {
      const value = (target as unknown as Record<string, unknown>)[prop as string];
      if (typeof value !== "function") return value;

      const asyncMethods = ["all", "first", "run", "raw"];
      if (!asyncMethods.includes(prop as string)) return value.bind(target);

      return (...args: unknown[]) => {
        const method = prop as string;
        return tracer.startActiveSpan("db.query", async (span: Span) => {
          span.setAttribute("db.system", "d1");
          span.setAttribute("db.statement", sql.slice(0, 500));
          span.setAttribute("db.operation", method);
          const start = performance.now();
          try {
            const result = await (value as (...a: unknown[]) => unknown).apply(target, args);
            if (method === "all" && result && typeof result === "object" && "results" in result) {
              span.setAttribute("db.response.returned_rows", (result as { results: unknown[] }).results.length);
            }
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
          } catch (err) {
            span.recordException(err as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
            throw err;
          } finally {
            span.setAttribute("db.query.duration_ms", Math.round(performance.now() - start));
            span.end();
          }
        });
      };
    },
  });
}

export function traceD1(db: D1Database): D1Database {
  const tracer = trace.getTracer(STORAGE_TRACER_NAME);
  return new Proxy(db, {
    get(target, prop) {
      const value = (target as unknown as Record<string, unknown>)[prop as string];
      if (typeof value !== "function") return value;

      if (prop === "prepare") {
        return (sql: string) => {
          const stmt = (value as (sql: string) => D1PreparedStatement).call(target, sql);
          return tracedD1Statement(stmt, sql);
        };
      }

      if (prop === "batch" || prop === "exec") {
        return (...args: unknown[]) => {
          const method = prop as string;
          return tracer.startActiveSpan("db.query", async (span: Span) => {
            span.setAttribute("db.system", "d1");
            span.setAttribute("db.operation", method);
            const start = performance.now();
            try {
              const result = await (value as (...a: unknown[]) => unknown).apply(target, args);
              span.setStatus({ code: SpanStatusCode.OK });
              return result;
            } catch (err) {
              span.recordException(err as Error);
              span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
              throw err;
            } finally {
              span.setAttribute("db.query.duration_ms", Math.round(performance.now() - start));
              span.end();
            }
          });
        };
      }

      return value.bind(target);
    },
  });
}

// ─── KV ───

export function traceKV(kv: KVNamespace): KVNamespace {
  const tracer = trace.getTracer(STORAGE_TRACER_NAME);
  return new Proxy(kv, {
    get(target, prop) {
      const value = (target as unknown as Record<string, unknown>)[prop as string];
      if (typeof value !== "function") return value;

      const tracedMethods = ["get", "put", "delete", "list"];
      if (!tracedMethods.includes(prop as string)) return value.bind(target);

      return (...args: unknown[]) => {
        const method = prop as string;
        const key = typeof args[0] === "string" ? args[0] : undefined;
        return tracer.startActiveSpan(`kv.${method}`, async (span: Span) => {
          span.setAttribute("db.system", "kv");
          span.setAttribute("kv.operation", method);
          if (key) span.setAttribute("kv.key", sanitizeKey(key));
          const start = performance.now();
          try {
            const result = await (value as (...a: unknown[]) => unknown).apply(target, args);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
          } catch (err) {
            span.recordException(err as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
            throw err;
          } finally {
            span.setAttribute("kv.duration_ms", Math.round(performance.now() - start));
            span.end();
          }
        });
      };
    },
  });
}

/**
 * Wrap all storage bindings on an Env object in one call.
 * Mutates the env object in place.
 */
export function traceEnv(env: { LEDGER: D1Database; CONFIG: KVNamespace; ARTIFACTS: R2Bucket }): void {
  env.LEDGER = traceD1(env.LEDGER);
  env.CONFIG = traceKV(env.CONFIG);
  env.ARTIFACTS = traceR2(env.ARTIFACTS);
}

function sanitizeKey(key: string): string {
  // Keep first 3 and last 3 path segments; mask the rest
  const parts = key.split("/");
  if (parts.length <= 6) return key;
  return [...parts.slice(0, 3), "...", ...parts.slice(-3)].join("/");
}

// ─── R2 ───

function tracedR2ObjectBody(body: R2ObjectBody, key: string): R2ObjectBody {
  const tracer = trace.getTracer(STORAGE_TRACER_NAME);
  return new Proxy(body, {
    get(target, prop) {
      const value = (target as unknown as Record<string, unknown>)[prop as string];
      if (typeof value !== "function") return value;

      const tracedMethods = ["arrayBuffer", "text", "json", "blob"];
      if (!tracedMethods.includes(prop as string)) return value.bind(target);

      return (...args: unknown[]) => {
        const method = prop as string;
        return tracer.startActiveSpan(`r2.body.${method}`, async (span: Span) => {
          span.setAttribute("db.system", "r2");
          span.setAttribute("r2.key", sanitizeKey(key));
          span.setAttribute("r2.operation", `body.${method}`);
          const start = performance.now();
          try {
            const result = await (value as (...a: unknown[]) => unknown).apply(target, args);
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
          } catch (err) {
            span.recordException(err as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
            throw err;
          } finally {
            span.setAttribute("r2.duration_ms", Math.round(performance.now() - start));
            span.end();
          }
        });
      };
    },
  });
}

export function traceR2(bucket: R2Bucket): R2Bucket {
  const tracer = trace.getTracer(STORAGE_TRACER_NAME);
  return new Proxy(bucket, {
    get(target, prop) {
      const value = (target as unknown as Record<string, unknown>)[prop as string];
      if (typeof value !== "function") return value;

      const tracedMethods = ["get", "put", "head", "delete", "list"];
      if (!tracedMethods.includes(prop as string)) return value.bind(target);

      return (...args: unknown[]) => {
        const method = prop as string;
        const key = typeof args[0] === "string" ? args[0] : undefined;
        return tracer.startActiveSpan(`r2.${method}`, async (span: Span) => {
          span.setAttribute("db.system", "r2");
          span.setAttribute("r2.operation", method);
          if (key) span.setAttribute("r2.key", sanitizeKey(key));
          const start = performance.now();
          try {
            const result = await (value as (...a: unknown[]) => unknown).apply(target, args);
            if (method === "put" && result && typeof result === "object" && "size" in result) {
              span.setAttribute("r2.object.size", (result as { size: number }).size);
            }
            if (method === "get" && result) {
              span.setAttribute("r2.object.size", (result as R2ObjectBody).size);
              span.setStatus({ code: SpanStatusCode.OK });
              return tracedR2ObjectBody(result as R2ObjectBody, key ?? "unknown");
            }
            span.setStatus({ code: SpanStatusCode.OK });
            return result;
          } catch (err) {
            span.recordException(err as Error);
            span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
            throw err;
          } finally {
            span.setAttribute("r2.duration_ms", Math.round(performance.now() - start));
            span.end();
          }
        });
      };
    },
  });
}
