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

class PhoenixProtobufExporter {
  private url: string;
  private headers: Record<string, string>;

  constructor(config: { url: string; headers?: Record<string, string> }) {
    this.url = config.url;
    this.headers = {
      accept: "application/x-protobuf",
      "content-type": "application/x-protobuf",
      "user-agent": "glim-think/1.0.0 (Cloudflare Worker; OTLP protobuf)",
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

  private send(items: ReadableSpan[], onSuccess: () => void, onError: (err: Error) => void): void {
    const exportMessage = ProtobufTraceSerializer.serializeRequest(items);
    if (!exportMessage || exportMessage.length === 0) {
      onSuccess();
      return;
    }

    __unwrappedFetch(this.url, {
      method: "POST",
      headers: this.headers,
      body: exportMessage,
    })
      .then(async (response) => {
        if (response.ok) {
          onSuccess();
        } else {
          const body = await response.text().catch(() => "");
          const spanInfo = items
            .map((s) => `${s.name}(${s.spanContext().traceId.slice(0, 8)}..${s.spanContext().spanId.slice(0, 4)})`)
            .join(", ");
          console.error(
            `Phoenix OTLP export failed: ${response.status} ${response.statusText} — ${body} | spans=[${spanInfo}]`
          );
          onError(new Error(`Phoenix OTLP export failed: ${response.status} ${response.statusText} — ${body}`));
        }
      })
      .catch((error) => {
        onError(new Error(`Phoenix OTLP export exception: ${String(error)}`));
      });
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

  const base = endpoint.replace(/\/$/, "");
  const url = base.endsWith("/v1/traces") ? base : `${base}/v1/traces`;
  return {
    exporter: new PhoenixProtobufExporter({
      url,
      headers: { Authorization: `Bearer ${apiKey}` },
    }),
    service: { name: projectName, version: "1.0.0" },
  };
};
