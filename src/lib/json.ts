// Implements: Doc 14 §10 (BigInt-safe JSON serialization)

// Monkeypatch BigInt.prototype.toJSON once globally so native JSON.stringify / NextResponse.json never crash
if (typeof BigInt !== 'undefined' && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function (this: bigint) {
    return this.toString();
  };
}

/**
 * Serializes any data structure containing BigInt values into a BigInt-safe plain object/value
 * where all BigInts are converted to string.
 */
export const toJson = <T>(v: T): any =>
  JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x)));

/**
 * Safe NextResponse-compatible JSON response constructor that guarantees BigInts serialize to strings.
 */
export function safeJsonResponse<T>(data: T, init?: ResponseInit): Response {
  const body = JSON.stringify(data, (_k, x) => (typeof x === 'bigint' ? x.toString() : x));
  return new Response(body, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}
