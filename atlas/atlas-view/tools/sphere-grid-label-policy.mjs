const ABSOLUTE_PATH = /^(?:\/|[A-Za-z]:\/)/;
const ABSOLUTE_NODE_URI = /^(?:node-)?[^:]+:\/\/[^/]+\/(?:\/|[A-Za-z]:\/)/;
const SENSITIVE_COMPONENT = /(?:^|\/)\.(?:worktrees(?:\/|$)|env[^/]*(?:\/|$))/i;
const HERMES_OPERATIONAL_PATH = /(?:^|\/)~\/\.hermes\/kanban\/boards\/[^/]+\/(?:logs|workspaces|attachments)(?:\/|$)/i;

export function privatePathReason(value) {
  if (typeof value !== 'string') return null;

  const normalized = value.replaceAll('\\', '/');
  if (ABSOLUTE_PATH.test(normalized) || ABSOLUTE_NODE_URI.test(normalized)) {
    return 'checkout-specific absolute path';
  }
  if (SENSITIVE_COMPONENT.test(normalized)) {
    return 'sensitive path';
  }
  if (HERMES_OPERATIONAL_PATH.test(normalized)) {
    return 'Hermes operational path';
  }
  return null;
}

export function assertPublicLabels(labels) {
  for (const label of labels) {
    for (const [field, value] of Object.entries(label)) {
      const reason = privatePathReason(value);
      if (reason) {
        throw new Error(`refusing ${reason} in label ${field}: ${value}`);
      }
    }
  }
}
