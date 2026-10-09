export interface CandidateCustomer {
  id: string;
  name: string;
  phone: string;
  altPhone?: string | null;
  relationType?: string | null;
  relationName?: string | null;
  locality?: string | null;
  city?: string | null;
  openGirviCount?: number;
  openCreditPaise?: bigint;
  lastTxnDate?: Date | null;
}

export interface RankedSuggestion {
  customer: CandidateCustomer;
  score: number;
  matchReasons: string[];
}

export function normalisePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function normaliseText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function rankCandidateCustomers(
  query: string,
  candidates: CandidateCustomer[]
): RankedSuggestion[] {
  const cleanQ = normaliseText(query);
  const cleanPhoneQ = normalisePhone(query);

  if (!cleanQ && !cleanPhoneQ) return [];

  const results: RankedSuggestion[] = [];

  for (const c of candidates) {
    let score = 0;
    const matchReasons: string[] = [];
    const cPhone = normalisePhone(c.phone);
    const cAltPhone = c.altPhone ? normalisePhone(c.altPhone) : '';

    // 1. Phone Exact Match
    if (cleanPhoneQ && cPhone === cleanPhoneQ) {
      score += 1.0;
      matchReasons.push('Exact phone match');
    } else if (cleanPhoneQ && cPhone.endsWith(cleanPhoneQ)) {
      score += 0.85;
      matchReasons.push('Phone suffix match');
    } else if (cleanPhoneQ && cAltPhone && cAltPhone.endsWith(cleanPhoneQ)) {
      score += 0.9;
      matchReasons.push('Alt phone match');
    }

    // 2. Name Prefix / Partial Match
    const cName = normaliseText(c.name);
    if (cleanQ && cName.startsWith(cleanQ)) {
      score += 0.75;
      matchReasons.push('Name prefix match');
    } else if (cleanQ && cName.includes(cleanQ)) {
      score += 0.55;
      matchReasons.push('Name partial match');
    }

    // 3. Relation Name Match
    if (c.relationName) {
      const cRel = normaliseText(c.relationName);
      if (cleanQ && cRel.includes(cleanQ)) {
        score += 0.65;
        matchReasons.push('Relation name match');
      }
    }

    // 4. Exposure Boost
    const hasExposure = (c.openGirviCount || 0) > 0 || (c.openCreditPaise || BigInt(0)) > BigInt(0);
    if (hasExposure) {
      score += 0.1;
      matchReasons.push('Active exposure');
    }

    if (score >= 0.35) {
      results.push({ customer: c, score, matchReasons });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}
