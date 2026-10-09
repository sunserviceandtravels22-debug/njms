import { describe, it, expect } from 'vitest';
import { computeActivityHash } from './activityLog';

describe('ActivityLog Hash Chain (D12-LOG-03)', () => {
  it('computes deterministic hash for identical inputs', () => {
    const timestamp = '2026-10-09T10:00:00.000Z';
    const row = {
      at: timestamp,
      userId: 'user_1',
      action: 'CREATE',
      entityType: 'InventoryItem',
      entityId: 'item_101',
      diff: { weightMg: { before: 0, after: 5000 } },
    };

    const hash1 = computeActivityHash('GENESIS', row);
    const hash2 = computeActivityHash('GENESIS', row);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('detects tampering when any field is altered', () => {
    const timestamp = '2026-10-09T10:00:00.000Z';
    const rowOriginal = {
      at: timestamp,
      userId: 'user_1',
      action: 'CREATE',
      entityType: 'InventoryItem',
      entityId: 'item_101',
      diff: { weightMg: { before: 0, after: 5000 } },
    };
    const rowTampered = {
      ...rowOriginal,
      diff: { weightMg: { before: 0, after: 4500 } }, // tampered!
    };

    const originalHash = computeActivityHash('GENESIS', rowOriginal);
    const tamperedHash = computeActivityHash('GENESIS', rowTampered);

    expect(originalHash).not.toBe(tamperedHash);
  });

  it('forms a continuous cryptographic chain across multiple sequential entries', () => {
    const rows = [
      {
        at: '2026-10-09T10:00:00.000Z',
        userId: 'u1',
        action: 'CREATE',
        entityType: 'Item',
        entityId: '1',
        diff: null,
      },
      {
        at: '2026-10-09T10:01:00.000Z',
        userId: 'u1',
        action: 'UPDATE',
        entityType: 'Item',
        entityId: '1',
        diff: { status: 'ON_HOLD' },
      },
      {
        at: '2026-10-09T10:02:00.000Z',
        userId: 'u2',
        action: 'STATUS_CHANGE',
        entityType: 'Item',
        entityId: '1',
        diff: { status: 'SOLD' },
      },
    ];

    let currentPrev = 'GENESIS';
    const chain: { prevHash: string; hash: string }[] = [];

    for (const r of rows) {
      const h = computeActivityHash(currentPrev, r);
      chain.push({ prevHash: currentPrev, hash: h });
      currentPrev = h;
    }

    expect(chain[0].prevHash).toBe('GENESIS');
    expect(chain[1].prevHash).toBe(chain[0].hash);
    expect(chain[2].prevHash).toBe(chain[1].hash);

    // Verify chain integrity
    let verifyPrev = 'GENESIS';
    for (let i = 0; i < rows.length; i++) {
      expect(chain[i].prevHash).toBe(verifyPrev);
      const expected = computeActivityHash(verifyPrev, rows[i]);
      expect(chain[i].hash).toBe(expected);
      verifyPrev = chain[i].hash;
    }
  });

  it('detects a broken chain link if an intermediate row hash is modified', () => {
    const r1 = { at: '2026-10-09T10:00:00.000Z', userId: 'u1', action: 'A', entityType: 'E', entityId: '1', diff: null };
    const r2 = { at: '2026-10-09T10:01:00.000Z', userId: 'u1', action: 'B', entityType: 'E', entityId: '2', diff: null };

    const h1 = computeActivityHash('GENESIS', r1);
    const h2 = computeActivityHash(h1, r2);

    // If an attacker tampers with r1
    const tamperedR1 = { ...r1, action: 'ATTACK' };
    const recalculateH1 = computeActivityHash('GENESIS', tamperedR1);

    expect(recalculateH1).not.toBe(h1);
    // h2 is invalid now because h2 was linked to h1
    const recalculateH2 = computeActivityHash(recalculateH1, r2);
    expect(recalculateH2).not.toBe(h2);
  });
});
