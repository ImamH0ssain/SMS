export function formatAuditMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const entries = Object.entries(metadata as Record<string, unknown>)
    .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value) || value === null)
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${value === null ? "none" : String(value)}`);
  return entries.length ? entries.join(" · ") : null;
}
