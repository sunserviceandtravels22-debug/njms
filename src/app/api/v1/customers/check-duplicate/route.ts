import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 100;
  if (!s1 || !s2) return 0;
  if (s1.includes(s2) || s2.includes(s1)) return 85;

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);

  let intersection = 0;
  b1.forEach((bg) => {
    if (b2.has(bg)) intersection++;
  });

  const total = b1.size + b2.size;
  if (total === 0) return 0;

  return Math.round((2 * intersection * 100) / total);
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, name, relationName, excludeCustomerId } = await req.json();

    const cleanPhone = phone?.replace(/\D/g, '') || '';
    const cleanName = name?.trim() || '';
    const cleanRelation = relationName?.trim() || '';

    if (!cleanPhone && !cleanName) {
      return NextResponse.json({ ok: true, candidates: [] });
    }

    const searchConditions: any[] = [];
    if (cleanPhone.length >= 4) {
      searchConditions.push({ phone: { contains: cleanPhone } });
      searchConditions.push({ altPhone: { contains: cleanPhone } });
    }
    if (cleanName.length >= 2) {
      searchConditions.push({ name: { contains: cleanName.slice(0, 3) } });
    }

    const whereClause: any = searchConditions.length > 0 ? { OR: searchConditions } : {};
    if (excludeCustomerId) {
      whereClause.id = { not: excludeCustomerId };
    }

    const existing = await db.customer.findMany({
      where: whereClause,
      take: 20,
    });

    const candidates = existing
      .map((c: any) => {
        let matchScore = 0;
        const reasons: string[] = [];

        if (cleanPhone && c.phone === cleanPhone) {
          matchScore = 100;
          reasons.push('Exact phone match');
        } else if (cleanPhone && c.altPhone === cleanPhone) {
          matchScore = Math.max(matchScore, 90);
          reasons.push('Matches alternate phone');
        }

        if (cleanName) {
          const nameSim = calculateSimilarity(cleanName, c.name);
          const relSim = cleanRelation && c.relationName ? calculateSimilarity(cleanRelation, c.relationName) : 0;

          if (nameSim >= 80 && relSim >= 80) {
            matchScore = Math.max(matchScore, 95);
            reasons.push(`High name & relation match (${nameSim}%)`);
          } else if (nameSim >= 80) {
            matchScore = Math.max(matchScore, 75);
            reasons.push(`Similar name match (${nameSim}%)`);
          }
        }

        return {
          customer: {
            ...c,
            creditLimitPaise: c.creditLimitPaise.toString(),
          },
          matchScore,
          reasons,
        };
      })
      .filter((item: any) => item.matchScore >= 60)
      .sort((a: any, b: any) => b.matchScore - a.matchScore);

    return NextResponse.json({
      ok: true,
      hasDuplicate: candidates.length > 0,
      candidates,
    });
  } catch (error: any) {
    console.error('Check duplicate customer error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to check duplicate customer' }, { status: 500 });
  }
}
