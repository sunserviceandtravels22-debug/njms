// Implements: D12-INX-01..28 | Doc: 12 §5, §6
// Inventory service: extended item tracking, weight revisions, packs, and status management.

import { db } from '@/server/db';
import { Prisma, ItemStatus, ItemClass, TrackingMode, ItemOwnership } from '@prisma/client';
import { getRateStamp } from './rateSnapshot';
import { writeLog, LogAction } from './activityLog';

export interface CreateInventoryItemInput {
  tagNo: string;
  sku?: string;
  name?: string;
  category: string;
  metal: 'GOLD' | 'SILVER';
  purity?: number;
  purityPpt?: number;
  grossWeightMg: number;
  netWeightMg: number;
  itemClass?: ItemClass;
  trackingMode?: TrackingMode;
  quantity?: number;
  piecesPerPack?: number;
  packTareMg?: number;
  reorderLevel?: number;
  reorderQty?: number;
  hsn?: string;
  gstRateBp?: number;
  costPaise?: bigint;
  ownership?: ItemOwnership;
  memoInLineId?: string;
  attributesJson?: any;
}

export async function createItem(
  input: CreateInventoryItemInput,
  userId: string,
  tx?: Prisma.TransactionClient
) {
  const runner = async (client: Prisma.TransactionClient) => {
    // 1. Get current rate stamp for this operation
    const stamp = await getRateStamp(new Date(), { tx: client, allowMissing: true });

    // 2. Create the inventory item
    const item = await client.inventoryItem.create({
      data: {
        tagNo: input.tagNo,
        sku: input.sku ?? input.tagNo,
        name: input.name ?? input.category,
        category: input.category,
        metal: input.metal,
        purityPpt: input.purityPpt ?? input.purity ?? 916,
        grossWeightMg: input.grossWeightMg,
        netWeightMg: input.netWeightMg,
        itemClass: input.itemClass ?? 'METAL_JEWELLERY',
        trackingMode: input.trackingMode ?? 'UNIQUE',
        quantity: input.quantity ?? 1,
        piecesPerPack: input.piecesPerPack,
        packTareMg: input.packTareMg,
        reorderLevel: input.reorderLevel,
        reorderQty: input.reorderQty,
        hsn: input.hsn,
        gstRateBp: input.gstRateBp,
        costPaise: input.costPaise,
        rateSnapshotId: stamp.id,
        ownership: input.ownership ?? 'OWNED',
        memoInLineId: input.memoInLineId,
        attributesJson: input.attributesJson ?? Prisma.JsonNull,
        status: 'IN_STOCK',
        createdById: userId,
      },
    });

    // 3. Write activity log in the same transaction
    await writeLog({
      tx: client,
      userId,
      module: 'INVENTORY',
      action: LogAction.CREATE,
      entityType: 'InventoryItem',
      entityId: item.id,
      after: { tagNo: item.tagNo, category: item.category, netWeightMg: item.netWeightMg },
      rateSnapshotId: stamp.id,
    });

    return item;
  };

  return tx ? runner(tx) : db.$transaction(runner);
}

export async function updateItemStatus(
  id: string,
  newStatus: ItemStatus,
  reason: string,
  userId: string,
  tx?: Prisma.TransactionClient
) {
  const runner = async (client: Prisma.TransactionClient) => {
    const prev = await client.inventoryItem.findUniqueOrThrow({ where: { id } });

    const updated = await client.inventoryItem.update({
      where: { id },
      data: { status: newStatus },
    });

    await writeLog({
      tx: client,
      userId,
      module: 'INVENTORY',
      action: LogAction.STATUS_CHANGE,
      entityType: 'InventoryItem',
      entityId: id,
      before: { status: prev.status },
      after: { status: newStatus },
      reasonText: reason,
    });

    return updated;
  };

  return tx ? runner(tx) : db.$transaction(runner);
}

export async function reviseWeight(
  id: string,
  newNetMg: number,
  reason: string,
  userId: string,
  tx?: Prisma.TransactionClient
) {
  const runner = async (client: Prisma.TransactionClient) => {
    const item = await client.inventoryItem.findUniqueOrThrow({ where: { id } });
    const stamp = await getRateStamp(new Date(), { tx: client, allowMissing: true });

    // 1. Record immutable weight revision row
    const revision = await client.itemWeightRevision.create({
      data: {
        inventoryItemId: id,
        oldNetMg: item.netWeightMg,
        newNetMg,
        reason,
        byUserId: userId,
        rateSnapshotId: stamp.id,
      },
    });

    // 2. Update item weight
    const updated = await client.inventoryItem.update({
      where: { id },
      data: { netWeightMg: newNetMg },
    });

    // 3. Write ActivityLog
    await writeLog({
      tx: client,
      userId,
      module: 'INVENTORY',
      action: LogAction.UPDATE,
      entityType: 'InventoryItem',
      entityId: id,
      before: { netWeightMg: item.netWeightMg },
      after: { netWeightMg: newNetMg },
      diff: { netWeightMg: { old: item.netWeightMg, new: newNetMg } },
      reasonText: reason,
      rateSnapshotId: stamp.id,
    });

    return { item: updated, revision };
  };

  return tx ? runner(tx) : db.$transaction(runner);
}

export async function openPack(
  id: string,
  unitsSold: number,
  actualWeightMg: number | undefined,
  userId: string,
  tx?: Prisma.TransactionClient
) {
  const runner = async (client: Prisma.TransactionClient) => {
    const item = await client.inventoryItem.findUniqueOrThrow({ where: { id } });

    const newOpenedUnits = (item.openedUnits ?? 0) + unitsSold;
    const newNetRemainingMg = actualWeightMg ?? Math.max(0, (item.netRemainingMg ?? item.netWeightMg) - (unitsSold * (item.netWeightMg / (item.piecesPerPack || 1))));

    const updated = await client.inventoryItem.update({
      where: { id },
      data: {
        openedUnits: newOpenedUnits,
        netRemainingMg: Math.round(newNetRemainingMg),
      },
    });

    await writeLog({
      tx: client,
      userId,
      module: 'INVENTORY',
      action: LogAction.UPDATE,
      entityType: 'InventoryItem',
      entityId: id,
      diff: { openedUnits: newOpenedUnits, netRemainingMg: Math.round(newNetRemainingMg) },
    });

    return updated;
  };

  return tx ? runner(tx) : db.$transaction(runner);
}
