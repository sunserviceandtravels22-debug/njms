import { describe, it, expect } from 'vitest';
import { toJson, safeJsonResponse } from './json';

describe('BigInt-safe JSON serialization (Doc 14 §10)', () => {
  it('serializes BigInt(11124000) to string "11124000" and parses back exactly', () => {
    const raw = {
      note: 'सोने की चेन ₹1,11,240 ✓',
      amountPaise: BigInt(11124000),
      items: [
        { id: 'item-1', valuePaise: BigInt(500000) },
        { id: 'item-2', valuePaise: BigInt(6124000) },
      ],
    };

    const serialized = toJson(raw);

    expect(serialized.amountPaise).toBe('11124000');
    expect(serialized.items[0].valuePaise).toBe('500000');
    expect(serialized.items[1].valuePaise).toBe('6124000');

    // Parse back to BigInt
    const parsedBack = BigInt(serialized.amountPaise);
    expect(parsedBack).toBe(11124000n);
  });

  it('preserves Hindi unicode text without degradation', () => {
    const data = { customerName: 'राम लाल शर्मा', city: 'वाराणसी' };
    const serialized = toJson(data);
    expect(serialized.customerName).toBe('राम लाल शर्मा');
    expect(serialized.city).toBe('वाराणसी');
  });

  it('safeJsonResponse returns valid JSON response without throwing', async () => {
    const payload = { ok: true, amount: BigInt(999999999999) };
    const res = safeJsonResponse(payload, { status: 201 });
    expect(res.status).toBe(201);
    expect(res.headers.get('Content-Type')).toBe('application/json');

    const json = await res.json();
    expect(json.amount).toBe('999999999999');
  });
});
