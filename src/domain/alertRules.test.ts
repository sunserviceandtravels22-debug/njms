import { describe, it, expect } from 'vitest';
import {
  buildDedupeKey,
  isAlertVisibleToRole,
  evaluateComparison,
  isSnoozeActive,
  shouldEscalate,
} from './alertRules';

describe('Alert Rules Domain (D12-ALT-01..03)', () => {
  it('builds canonical dedupe keys', () => {
    const key = buildDedupeKey('STOCK_NEGATIVE', 'InventoryItem', 'item_123');
    expect(key).toBe('STOCK_NEGATIVE:InventoryItem:item_123');
  });

  it('filters alert visibility based on user roles', () => {
    const managerOnly = ['OWNER', 'MANAGER'];
    expect(isAlertVisibleToRole(managerOnly, 'STAFF')).toBe(false);
    expect(isAlertVisibleToRole(managerOnly, 'MANAGER')).toBe(true);
    expect(isAlertVisibleToRole(managerOnly, 'OWNER')).toBe(true);
    expect(isAlertVisibleToRole([], 'STAFF')).toBe(true);
  });

  it('evaluates threshold comparisons correctly', () => {
    expect(evaluateComparison(-1, '<', 0)).toBe(true);
    expect(evaluateComparison(0, '<', 0)).toBe(false);
    expect(evaluateComparison(100, '>=', 100)).toBe(true);
    expect(evaluateComparison(50, '>', 100)).toBe(false);
  });

  it('handles snooze expiry checks accurately', () => {
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 60_000);
    expect(isSnoozeActive(future)).toBe(true);
    expect(isSnoozeActive(past)).toBe(false);
    expect(isSnoozeActive(null)).toBe(false);
  });

  it('evaluates alert escalation timeouts', () => {
    const raised30mAgo = new Date(Date.now() - 30 * 60_000);
    expect(shouldEscalate(raised30mAgo, 20)).toBe(true);
    expect(shouldEscalate(raised30mAgo, 45)).toBe(false);
  });
});
