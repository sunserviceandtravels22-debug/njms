import { describe, it, expect } from 'vitest';
import {
  toggleSelection,
  invertSelection,
  selectRange,
  validateBulkActionLimit,
} from './selection';

describe('Selection Logic (D12-SEL-01..18)', () => {
  it('toggles single item in and out of selection', () => {
    let selected = new Set<string>();
    selected = toggleSelection(selected, 'item_1');
    expect(selected.has('item_1')).toBe(true);
    expect(selected.size).toBe(1);

    selected = toggleSelection(selected, 'item_1');
    expect(selected.has('item_1')).toBe(false);
    expect(selected.size).toBe(0);
  });

  it('inverts selection across visible items', () => {
    const visible = ['a', 'b', 'c', 'd'];
    const current = new Set(['a', 'c']);
    const inverted = invertSelection(visible, current);

    expect(Array.from(inverted)).toEqual(['b', 'd']);
  });

  it('computes range selection properly', () => {
    const list = ['a', 'b', 'c', 'd', 'e'];
    const range = selectRange(list, 'b', 'd');
    expect(Array.from(range)).toEqual(['b', 'c', 'd']);

    const reverseRange = selectRange(list, 'd', 'b');
    expect(Array.from(reverseRange)).toEqual(['b', 'c', 'd']);
  });

  it('validates bulk action limits according to rules', () => {
    expect(validateBulkActionLimit(50, 100).valid).toBe(true);
    expect(validateBulkActionLimit(150, 100).valid).toBe(false);
    expect(validateBulkActionLimit(150, 100).error).toContain('exceeds limit of 100');
    expect(validateBulkActionLimit(500).valid).toBe(true);
  });
});
