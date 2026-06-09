import type { BenchmarkRecord } from "../types";

type RawRecord = Record<string, unknown>;

function firstString(raw: RawRecord, ...keys: string[]): string | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(raw: RawRecord, ...keys: string[]): number | null {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function provenanceObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {};
    } catch {
      return { raw: value };
    }
  }
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function normalizeBenchmarkRecord(raw: unknown): BenchmarkRecord | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const source = raw as RawRecord;
  const recordId = firstString(source, "recordId", "record_id");
  const element = firstString(source, "element");
  const potentialId = firstString(source, "potentialId", "potential_id");
  const potentialLabel = firstString(source, "potentialLabel", "potential_label") ?? potentialId;
  const pairStyle = firstString(source, "pairStyle", "pair_style") ?? "mlip";
  const property = firstString(source, "property");
  const reference = firstNumber(source, "reference");
  const predicted = firstNumber(source, "predicted");
  const unit = firstString(source, "unit") ?? "";
  const agentId = firstString(source, "agentId", "agent_id") ?? "unknown";
  const timestamp = firstString(source, "timestamp") ?? new Date().toISOString();
  if (!recordId || !element || !potentialId || !potentialLabel || !property) return null;
  if (reference === null || predicted === null) return null;
  return {
    recordId,
    element,
    potentialId,
    potentialLabel,
    pairStyle,
    property,
    reference,
    predicted,
    unit,
    provenance: provenanceObject(source.provenance),
    agentId,
    timestamp,
  };
}

export function benchmarkAbsError(record: BenchmarkRecord): number {
  return Math.abs(record.predicted - record.reference);
}

export function benchmarkRelativeError(record: BenchmarkRecord): number {
  const denom = Math.abs(record.reference);
  return denom > 0 ? benchmarkAbsError(record) / denom : Number.POSITIVE_INFINITY;
}

export function benchmarkRecordKey(record: BenchmarkRecord): string {
  return `${record.element}:${record.potentialId}:${record.property}`;
}
