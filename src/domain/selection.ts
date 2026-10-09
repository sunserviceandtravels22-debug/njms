// Implements: D12-SEL-01..18 | Pure selection domain helpers

export interface BulkActionDef {
  id: string;
  label: string;
  requiresPin?: boolean;
  maxItems?: number;
  roles?: string[];
  isDestructive?: boolean;
}

export function toggleSelection(currentIds: Set<string>, id: string): Set<string> {
  const next = new Set(currentIds);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export function invertSelection(allVisibleIds: string[], currentSelectedIds: Set<string>): Set<string> {
  const next = new Set<string>();
  for (const id of allVisibleIds) {
    if (!currentSelectedIds.has(id)) {
      next.add(id);
    }
  }
  return next;
}

export function selectRange(allIds: string[], startId: string, endId: string): Set<string> {
  const startIndex = allIds.indexOf(startId);
  const endIndex = allIds.indexOf(endId);
  if (startIndex === -1 || endIndex === -1) return new Set();

  const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
  const range = allIds.slice(from, to + 1);
  return new Set(range);
}

export function validateBulkActionLimit(
  selectedCount: number,
  maxItems?: number
): { valid: boolean; error?: string } {
  if (maxItems && selectedCount > maxItems) {
    return {
      valid: false,
      error: `Selection of ${selectedCount} items exceeds limit of ${maxItems}. Please split the batch.`,
    };
  }
  return { valid: true };
}
