import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { db } from '@/server/db';
import { writeAuditLog } from '@/server/audit';
import { gramsToMg, mgToGrams } from '@/domain/weight';
import { rupeesToPaise, paiseToRupees } from '@/domain/money';
import { Metal, MakingType, ItemStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const item = await db.inventoryItem.findUnique({
      where: { id: params.id },
    });

    if (!item) {
      return NextResponse.json({ ok: false, error: 'Inventory item not found' }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: item.id,
        tagNo: item.tagNo,
        sku: item.sku,
        name: item.name,
        metal: item.metal,
        purityPpt: item.purityPpt,
        category: item.category,
        grossWeightGrams: mgToGrams(item.grossWeightMg),
        stoneWeightGrams: mgToGrams(item.stoneWeightMg),
        netWeightGrams: mgToGrams(item.netWeightMg),
        makingType: item.makingType,
        makingValueRupees: paiseToRupees(item.makingValuePaise),
        costRupees: item.costPaise ? paiseToRupees(item.costPaise) : 0,
        huid: item.huid || null,
        status: item.status,
        photoUrl: item.photoUrl || null,
        attributesJson: item.attributesJson || null,
        createdAt: item.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to fetch item' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const existing = await db.inventoryItem.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Inventory item not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      sku,
      category,
      metal,
      purityPpt,
      grossWeightGrams,
      stoneWeightGrams,
      netWeightGrams,
      makingType,
      makingValueRupees,
      costRupees,
      huid,
      status,
      photoUrl,
    } = body;

    const gMg = grossWeightGrams !== undefined ? gramsToMg(parseFloat(grossWeightGrams) || 0) : existing.grossWeightMg;
    const sMg = stoneWeightGrams !== undefined ? gramsToMg(parseFloat(stoneWeightGrams) || 0) : existing.stoneWeightMg;
    const nMg = netWeightGrams !== undefined ? gramsToMg(parseFloat(netWeightGrams) || 0) : Math.max(0, gMg - sMg);

    const updated = await db.inventoryItem.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        sku: sku !== undefined ? sku.trim() : existing.sku,
        category: category !== undefined ? category.trim() : existing.category,
        metal: metal !== undefined ? (metal as Metal) : existing.metal,
        purityPpt: purityPpt !== undefined ? parseInt(purityPpt, 10) : existing.purityPpt,
        grossWeightMg: gMg,
        stoneWeightMg: sMg,
        netWeightMg: nMg,
        makingType: makingType !== undefined ? (makingType as MakingType) : existing.makingType,
        makingValuePaise: makingValueRupees !== undefined ? rupeesToPaise(parseFloat(makingValueRupees) || 0) : existing.makingValuePaise,
        costPaise: costRupees !== undefined ? rupeesToPaise(parseFloat(costRupees) || 0) : existing.costPaise,
        huid: huid !== undefined ? (huid ? huid.trim() : null) : existing.huid,
        status: status !== undefined ? (status as ItemStatus) : existing.status,
        photoUrl: photoUrl !== undefined ? photoUrl : existing.photoUrl,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'UPDATE_INVENTORY_ITEM',
      entity: 'InventoryItem',
      entityId: existing.id,
      before: {
        name: existing.name,
        tagNo: existing.tagNo,
        status: existing.status,
        netWeightGrams: mgToGrams(existing.netWeightMg),
      },
      after: {
        name: updated.name,
        tagNo: updated.tagNo,
        status: updated.status,
        netWeightGrams: mgToGrams(updated.netWeightMg),
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Inventory item updated successfully',
      data: {
        id: updated.id,
        tagNo: updated.tagNo,
        name: updated.name,
        category: updated.category,
        status: updated.status,
      },
    });
  } catch (error: any) {
    console.error('Update inventory item error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const existing = await db.inventoryItem.findUnique({
      where: { id: params.id },
    });

    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Inventory item not found' }, { status: 404 });
    }

    await db.inventoryItem.delete({
      where: { id: params.id },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'DELETE_INVENTORY_ITEM',
      entity: 'InventoryItem',
      entityId: existing.id,
      before: {
        tagNo: existing.tagNo,
        name: existing.name,
        status: existing.status,
      },
    });

    return NextResponse.json({ ok: true, message: 'Item deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || 'Failed to delete item' }, { status: 500 });
  }
}
