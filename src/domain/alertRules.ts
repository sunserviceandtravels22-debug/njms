// Implements: D12-ALT-01..03 | Doc: 12 §3
// Pure domain helpers for alert evaluation, deduplication, and audience gating.

export interface AlertRuleDef {
  code: string;
  module: string;
  kind: 'EVENT' | 'THRESHOLD' | 'SCHEDULE' | 'ABSENCE';
  severity: 'INFO' | 'WARN' | 'CRITICAL';
  audience: string[]; // e.g. ['OWNER', 'MANAGER', 'STAFF', 'ACCOUNTANT']
  channels: string[]; // ['UI_BELL', 'UI_STRIP', 'SMS', 'WHATSAPP']
  dedupeKeyExpr?: string;
  autoResolveExpr?: string;
  escalateAfterMin?: number;
  manualResolve?: boolean;
}

export function buildDedupeKey(
  ruleCode: string,
  entityType: string,
  entityId: string
): string {
  return `${ruleCode}:${entityType}:${entityId}`;
}

export function isAlertVisibleToRole(
  audienceRoles: string[] | null | undefined,
  userRole: string
): boolean {
  if (!audienceRoles || audienceRoles.length === 0) return true;
  return audienceRoles.includes(userRole);
}

export function evaluateComparison(
  current: number,
  operator: '>' | '>=' | '<' | '<=' | '==' | '!=',
  threshold: number
): boolean {
  switch (operator) {
    case '>': return current > threshold;
    case '>=': return current >= threshold;
    case '<': return current < threshold;
    case '<=': return current <= threshold;
    case '==': return current === threshold;
    case '!=': return current !== threshold;
    default: return false;
  }
}

export function isSnoozeActive(snoozeUntil: Date | null | undefined, now: Date = new Date()): boolean {
  if (!snoozeUntil) return false;
  return snoozeUntil.getTime() > now.getTime();
}

export function shouldEscalate(
  firstRaisedAt: Date,
  escalateAfterMin: number | null | undefined,
  now: Date = new Date()
): boolean {
  if (!escalateAfterMin || escalateAfterMin <= 0) return false;
  const elapsedMinutes = (now.getTime() - firstRaisedAt.getTime()) / (1000 * 60);
  return elapsedMinutes >= escalateAfterMin;
}
