import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { calculateOldGoldValuation } from '@/domain/oldgold/valuation';
import { Direction, PayRefType, FlowKind, PayMode } from '@prisma/client';
import { rupeesToPaise } from '@/domain/money';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      sellerName,
      sellerPhone,
      grossWeightGrams,
      stoneDeductionGrams = 0,
      otherDeductionGrams = 0,
      testedPurityPpt = 900,
      deductionBp = 200,
      fineRateRupeesPerGram = 7000,
      paymentMode = 'CASH',
      notes,
    } = body;

    if (!sellerName || !sellerName.trim()) {
      return NextResponse.json({ ok: false, error: 'Seller name is required' }, { status: 400 });
    }

    const gGrams = parseFloat(grossWeightGrams);
    if (!gGrams || gGrams <= 0) {
      return NextResponse.json({ ok: false, error: 'Gross weight in Grams (g) is required' }, { status: 400 });
    }

    // 1. Calculate valuation using pure domain engine
    const valResult = calculateOldGoldValuation({
      grossWeightGrams: gGrams,
      stoneDeductionGrams: parseFloat(stoneDeductionGrams) || 0,
      otherDeductionGrams: parseFloat(otherDeductionGrams) || 0,
      testedPurityPpt: parseInt(testedPurityPpt, 10) || 900,
      deductionBp: parseInt(deductionBp, 10) || 200,
      fineRateRupeesPerGram: parseFloat(fineRateRupeesPerGram) || 7000,
    });

    const voucherNo = `OGV-${Date.now().toString().slice(-6)}`;

    // 2. Post Cash Payout Ledger Entry (Money paid to Seller)
    const payment = await db.payment.create({
      data: {
        businessDate: new Date(),
        refType: PayRefType.OLD_GOLD,
        refId: voucherNo,
        direction: Direction.OUT,
        flowKind: FlowKind.OLD_GOLD_PAYOUT,
        mode: (paymentMode as PayMode) || PayMode.CASH,
        amountPaise: valResult.payablePaise,
        createdById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_OLD_GOLD_VOUCHER',
      entity: 'Payment',
      entityId: payment.id,
      after: {
        voucherNo,
        sellerName: sellerName.trim(),
        grossWeightGrams: gGrams,
        payableRupees: valResult.payableRupees,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        voucherNo,
        sellerName: sellerName.trim(),
        sellerPhone: sellerPhone?.replace(/\D/g, '') || null,
        valuation: valResult,
        paymentId: payment.id,
      },
    });
  } catch (error: any) {
    console.error('Old gold valuation error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to process old gold purchase' }, { status: 500 });
  }
}
