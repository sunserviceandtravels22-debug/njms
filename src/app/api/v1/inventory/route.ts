import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { Metal, MakingType, ItemStatus } from '@prisma/client';
import { gramsToMg, mgToGrams } from '@/domain/weight';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const metal = searchParams.get('metal') as Metal | null;
    const status = searchParams.get('status') as ItemStatus | null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (metal) whereClause.metal = metal;
    if (status) whereClause.status = status;

    if (search) {
      whereClause.OR = [
        { tagNo: { contains: search } },
        { name: { contains: search } },
        { sku: { contains: search } },
        { huid: { contains: search } },
      ];
    }

    const [items, total] = await Promise.all([
      db.inventoryItem.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.inventoryItem.count({ where: whereClause }),
    ]);

    const formatted = items.map((item) => ({
      id: item.id,
      tagNo: item.tagNo,
      sku: item.sku,
      name: item.name,
      metal: item.metal,
      purityPpt: item.purityPpt,
      category: item.category,
      grossWeightGrams: mgToGrams(item.grossWeightMg), // Displayed in Grams (g)
      stoneWeightGrams: mgToGrams(item.stoneWeightMg),
      netWeightGrams: mgToGrams(item.netWeightMg),
      makingType: item.makingType,
      makingValueRupees: paiseToRupees(item.makingValuePaise), // Displayed in Rupees (₹)
      huid: item.huid || null,
      status: item.status,
      ownership: item.ownership,
      memoInLineId: item.memoInLineId,
      preferredVendorId: item.preferredVendorId,
      costPaise: item.costPaise ? item.costPaise.toString() : null,
      costRupees: item.costPaise ? paiseToRupees(item.costPaise) : null,
      attributesJson: item.attributesJson,
      photoUrl: item.photoUrl || null,
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json({
      ok: true,
      data: formatted,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('Fetch inventory error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      name,
      sku,
      category = 'Ring',
      metal = 'GOLD',
      purityPpt = 916,
      grossWeightGrams,
      stoneWeightGrams = 0,
      makingType = 'PER_GRAM',
      makingValueRupees = 0,
      huid,
      photoUrl,
      costRupees,
      ownership = 'OWNED',
      vendorName,
      purchaseTerms = 'PAID_IMMEDIATE',
      provisionalRatePerGram,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: 'Item name is required' }, { status: 400 });
    }

    const grossG = parseFloat(grossWeightGrams);
    if (!grossG || grossG <= 0) {
      return NextResponse.json({ ok: false, error: 'Gross weight in Grams (g) is required' }, { status: 400 });
    }

    const grossMg = gramsToMg(grossG);
    const stoneMg = gramsToMg(parseFloat(stoneWeightGrams) || 0);
    const netMg = Math.max(0, grossMg - stoneMg);

    const tagNo = `TAG-${Date.now().toString().slice(-8)}`;
    const generatedSku = sku?.trim() || `${category.toUpperCase().slice(0, 3)}-${Date.now().toString().slice(-4)}`;

    const cRupees = parseFloat(costRupees) || 0;
    const costPaise = cRupees > 0 ? rupeesToPaise(cRupees) : null;

    const attributesJson: any = {};
    if (purchaseTerms) attributesJson.purchaseTerms = purchaseTerms;
    if (vendorName) attributesJson.vendorName = vendorName.trim();
    if (provisionalRatePerGram) attributesJson.provisionalRatePerGram = parseFloat(provisionalRatePerGram);
    if (purchaseTerms === 'ON_CREDIT_FLOATING_RATE') {
      attributesJson.settlementStatus = 'UNSETTLED';
      attributesJson.receivedDate = new Date().toISOString().split('T')[0];
    }

    const newItem = await db.inventoryItem.create({
      data: {
        tagNo,
        sku: generatedSku,
        name: name.trim(),
        metal: metal as Metal,
        purityPpt: parseInt(purityPpt, 10) || 916,
        category: category.trim(),
        grossWeightMg: grossMg,
        stoneWeightMg: stoneMg,
        netWeightMg: netMg,
        makingType: (makingType as MakingType) || MakingType.PER_GRAM,
        makingValuePaise: rupeesToPaise(parseFloat(makingValueRupees) || 0),
        costPaise,
        ownership: ownership === 'MEMO_IN' ? 'MEMO_IN' : 'OWNED',
        attributesJson: Object.keys(attributesJson).length > 0 ? attributesJson : undefined,
        huid: huid?.trim() || null,
        photoUrl: photoUrl || null,
        createdById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_INVENTORY_ITEM',
      entity: 'InventoryItem',
      entityId: newItem.id,
      after: {
        tagNo: newItem.tagNo,
        name: newItem.name,
        grossWeightGrams: grossG,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...newItem,
        makingValuePaise: newItem.makingValuePaise.toString(),
        grossWeightGrams: grossG,
        netWeightGrams: mgToGrams(netMg),
        makingValueRupees: parseFloat(makingValueRupees) || 0,
      },
    });
  } catch (error: any) {
    console.error('Create inventory error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to create inventory item' }, { status: 500 });
  }
}
