/**
 * Phoenix Cloud (Arize AI) telemetry configuration for Cloudflare Workers.
 *
 * Uses @microlabs/otel-cf-workers for instrumentation with a custom protobuf
 * OTLP exporter. Phoenix Cloud requires `application/x-protobuf` and a
 * `User-Agent` header (returns 400 without one).
 */

import { OTLPExporter, __unwrappedFetch, type ResolveConfigFn } from "@microlabs/otel-cf-workers";
import { ProtobufTraceSerializer } from "@opentelemetry/otlp-transformer";
import type { ReadableSpan } from "@opentelemetry/sdk-trace-base";
import type { ExportResult } from "@opentelemetry/core";
import type { Env } from "../types";
import { makeOpenInferencePostProcessor } from "./openinference";

class PhoenixProtobufExporter {
  private url: string;
  private headers: Record<string, string>;
  private applyProjection: (spans: ReadableSpan[]) => ReadableSpan[];

  constructor(config: {
    url: string;
    headers?: Record<string, string>;
    projectName: string;
  }) {
    this.url = config.url;
    // otel-cf-workers rc.52 silently ignores the `postProcessor` config hook
    // (it is dropped in parseConfig — exporter path). So the OpenInference
    // projection + Phoenix project-routing resource attribute are applied
    // here, inside export(), which IS invoked. See OBSERVABILITY.md.
    this.applyProjection = makeOpenInferencePostProcessor(config.projectName);
    this.headers = {
      accept: "application/x-protobuf",
      "content-type": "application/x-protobuf",
      // Phoenix Cloud's WAF redirects unrecognized/custom product
      // User-Agents (anything like "glim-think/*") to /login — even with a
      // valid Bearer key — silently dropping every span. It allows the
      // standard OTLP exporter UA, which is also accurate (this IS an OTLP
      // protobuf exporter). Do NOT change this to a custom string.
      "user-agent": "OTel-OTLP-Exporter-JavaScript/0.200.0",
      ...config.headers,
    };
  }

  export(items: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    this._export(items)
      .then(() => {
        resultCallback({ code: 0 }); // ExportResultCode.SUCCESS
      })
      .catch((error) => {
        resultCallback({ code: 1, error }); // ExportResultCode.FAILED
      });
  }

  private _export(items: ReadableSpan[]): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.send(items, resolve, reject);
      } catch (e) {
        reject(e);
      }
    });
  }

  // Transient HTTP statuses worth one or more retries. Anything else
  // (400/401/403/404 — config/auth/payload errors) fails fast: retrying
  // would only spam Phoenix with the same broken request.
  private static readonly RETRYABLE = new Set([408, 429, 500, 502, 503, 504]);
  // Bounded so isolate flush (run under waitUntil) is never stalled long.
  private static readonly MAX_ATTEMPTS = 3;
  private static readonly BACKOFF_MS = [200, 600];

  private send(items: ReadableSpan[], onSuccess: () => void, onError: (err: Error) => void): void {
    // Project Vercel AI SDK spans → OpenInference conventions and stamp the
    // Phoenix project-routing resource attribute, in place, before serialize.
    const projected = this.applyProjection(items);
    const exportMessage = ProtobufTraceSerializer.serializeRequest(projected);
    if (!exportMessage || exportMessage.length === 0) {
      onSuccess();
      return;
    }
    // `serializeRequest` returns a Uint8Array that may be a *view* into a
    // larger pooled ArrayBuffer (byteOffset > 0 / byteLength < buffer length).
    // The Cloudflare Workers fetch implementation can transmit such a view as
    // a zero-length body — the request arrives empty (relay logged 400 "empty
    // body"). Copy into a fresh, contiguous, zero-offset buffer before send.
    const bodyBytes = new Uint8Array(exportMessage.byteLength);
    bodyBytes.set(exportMessage);

    const spanInfo = () =>
      items
        .map((s) => `${s.name}(${s.spanContext().traceId.slice(0, 8)}..${s.spanContext().spanId.slice(0, 4)})`)
        .join(", ");

    const attempt = async (n: number): Promise<void> => {
      try {
        const response = await __unwrappedFetch(this.url, {
          method: "POST",
          headers: this.headers,
          body: bodyBytes,
          // redirect:manual is critical. Phoenix Cloud answers an
          // unauthenticated/edge-intercepted request with 302→/login. The
          // default (follow) lands on a 200 HTML login page, so `response.ok`
          // is true and EVERY span is silently discarded with no error. Manual
          // redirect turns that into an explicit, loud failure.
          redirect: "manual",
        });
        // Treat a redirect (auth/edge interception) as a hard failure, not
        // success — otherwise span loss is invisible.
        if (response.status >= 300 && response.status < 400) {
          const loc = response.headers.get("location") ?? "(none)";
          console.error(
            `Phoenix OTLP export got redirect ${response.status} → ${loc} — auth/endpoint misconfig; spans NOT ingested. url=${this.url} spans=[${spanInfo()}]`
          );
          onError(new Error(`Phoenix OTLP export redirected (${response.status} → ${loc}) — not ingested`));
          return;
        }
        if (response.ok) {
          onSuccess();
          return;
        }
        const body = await response.text().catch(() => "");
        const retryable = PhoenixProtobufExporter.RETRYABLE.has(response.status);
        if (retryable && n < PhoenixProtobufExporter.MAX_ATTEMPTS) {
          const delay = PhoenixProtobufExporter.BACKOFF_MS[n - 1] ?? 600;
          console.warn(
            `Phoenix OTLP export ${response.status} ${response.statusText} (attempt ${n}/${PhoenixProtobufExporter.MAX_ATTEMPTS}), retrying in ${delay}ms`
          );
          await new Promise((r) => setTimeout(r, delay));
          return attempt(n + 1);
        }
        console.error(
          `Phoenix OTLP export failed: ${response.status} ${response.statusText} — ${body} | spans=[${spanInfo()}]`
        );
        onError(new Error(`Phoenix OTLP export failed: ${response.status} ${response.statusText} — ${body}`));
      } catch (error) {
        // Network/exception path is transient by nature — retry within budget.
        if (n < PhoenixProtobufExporter.MAX_ATTEMPTS) {
          const delay = PhoenixProtobufExporter.BACKOFF_MS[n - 1] ?? 600;
          console.warn(
            `Phoenix OTLP export exception (attempt ${n}/${PhoenixProtobufExporter.MAX_ATTEMPTS}), retrying in ${delay}ms: ${String(error)}`
          );
          await new Promise((r) => setTimeout(r, delay));
          return attempt(n + 1);
        }
        onError(new Error(`Phoenix OTLP export exception: ${String(error)}`));
      }
    };

    void attempt(1);
  }

  async shutdown(): Promise<void> {
    // No-op; batches are flushed by the span processor.
  }
}

export const phoenixConfig: ResolveConfigFn<Env> = (env, _trigger) => {
  const endpoint = env.PHOENIX_COLLECTOR_ENDPOINT?.trim().replace(/^['"]|['"]$/g, "");
  const apiKey = env.PHOENIX_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  const projectName = env.PHOENIX_PROJECT_NAME?.trim().replace(/^['"]|['"]$/g, "") || "glim-think";

  if (!endpoint || !apiKey) {
    return {
      exporter: new OTLPExporter({ url: "https://localhost/v1/traces" }),
      service: { name: projectName },
    };
  }

  // Cloudflare black-holes Worker→Phoenix-Cloud OTLP at the edge (proven —
  // see OBSERVABILITY.md). When a relay is configured, export through it
  // (GCP→Phoenix ingests fine); the relay injects the Bearer key + WAF-safe
  // User-Agent. Direct export is kept only as a (known-broken) fallback so a
  // missing relay var degrades loudly via the hardened error path, not
  // silently.
  const relayUrl = env.PHOENIX_RELAY_URL?.trim().replace(/^['"]|['"]$/g, "");
  const relayToken = env.PHOENIX_RELAY_TOKEN?.trim().replace(/^['"]|['"]$/g, "");
  const directBase = endpoint.replace(/\/$/, "");
  const directUrl = directBase.endsWith("/v1/traces") ? directBase : `${directBase}/v1/traces`;

  const useRelay = !!relayUrl && !!relayToken;
  const url = useRelay
    ? `${relayUrl!.replace(/\/$/, "")}/v1/traces`
    : directUrl;
  const exporterHeaders = useRelay
    ? { "x-relay-token": relayToken! }
    : { Authorization: `Bearer ${apiKey}` };

  return {
    exporter: new PhoenixProtobufExporter({
      url,
      headers: exporterHeaders,
      projectName,
    }),
    // NOTE: otel-cf-workers rc.52 ignores `postProcessor` (dropped in
    // parseConfig). The OpenInference projection + project routing run inside
    // the exporter instead — see PhoenixProtobufExporter. Do not re-add a
    // `postProcessor` here expecting it to run.
    service: { name: projectName, version: "1.0.0" },
  };
};
