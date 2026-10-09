import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { writeAuditLog } from '@/server/audit';

export const dynamic = 'force-dynamic';

const DEFAULT_SKUS = [
  { skuCode: 'SKU-GLD-RING-22K', metalType: 'Gold', category: 'Ring', description: '22K Gold Ring Standard', defaultTunch: 91.6, defaultPurityStandard: '22K', minStockLevel: 5, active: true },
  { skuCode: 'SKU-GLD-CHN-22K', metalType: 'Gold', category: 'Chain', description: '22K Gold Machine Chain', defaultTunch: 91.6, defaultPurityStandard: '22K', minStockLevel: 3, active: true },
  { skuCode: 'SKU-SLV-PAYAL-925', metalType: 'Silver', category: 'Payal', description: '925 Sterling Silver Payal', defaultTunch: 92.5, defaultPurityStandard: '925', minStockLevel: 8, active: true },
];

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const setting = await db.setting.findUnique({ where: { key: 'sku_master_catalog' } });
    const skus = setting ? (setting.value as any) : DEFAULT_SKUS;

    return NextResponse.json({ ok: true, data: skus });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch SKU catalog' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { skuCode, metalType, category, description, defaultTunch = 91.6, minStockLevel = 5, active = true } = body;

    if (!skuCode) return NextResponse.json({ ok: false, error: 'SKU code is required' }, { status: 400 });

    const setting = await db.setting.findUnique({ where: { key: 'sku_master_catalog' } });
    const currentList: any[] = setting ? (setting.value as any) : DEFAULT_SKUS;

    const existingIdx = currentList.findIndex((s) => s.skuCode.toUpperCase() === skuCode.toUpperCase());
    const newSku = {
      skuCode: skuCode.toUpperCase(),
      metalType,
      category,
      description: description || '',
      defaultTunch: parseFloat(defaultTunch),
      defaultPurityStandard: `${defaultTunch}%`,
      minStockLevel: parseInt(minStockLevel, 10),
      active: Boolean(active),
    };

    let updatedList;
    if (existingIdx >= 0) {
      updatedList = [...currentList];
      updatedList[existingIdx] = newSku;
    } else {
      updatedList = [...currentList, newSku];
    }

    await db.setting.upsert({
      where: { key: 'sku_master_catalog' },
      create: { key: 'sku_master_catalog', value: updatedList, updatedById: user.id },
      update: { value: updatedList, updatedById: user.id },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'UPDATE_SKU',
      entity: 'SKUMaster',
      entityId: skuCode,
      after: newSku,
    });

    return NextResponse.json({ ok: true, data: newSku });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to save SKU' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const skuCode = searchParams.get('skuCode');
    if (!skuCode) return NextResponse.json({ ok: false, error: 'skuCode parameter required' }, { status: 400 });

    const setting = await db.setting.findUnique({ where: { key: 'sku_master_catalog' } });
    const currentList: any[] = setting ? (setting.value as any) : DEFAULT_SKUS;

    const filtered = currentList.filter((s) => s.skuCode !== skuCode);
    await db.setting.upsert({
      where: { key: 'sku_master_catalog' },
      create: { key: 'sku_master_catalog', value: filtered, updatedById: user.id },
      update: { value: filtered, updatedById: user.id },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'DELETE_SKU',
      entity: 'SKUMaster',
      entityId: skuCode,
    });

    return NextResponse.json({ ok: true, message: 'SKU deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to delete SKU' }, { status: 500 });
  }
}
