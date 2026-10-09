// Implements: D12-WHS-01..27 | Doc: 13 §51, §52, §54
// Service layer for receiving wholesaler memo-in lots, creating inventory items, holds, returns, and loss settlements.

import { db } from '@/server/db';
import { Prisma, Metal, AlterPolicy, RateMode } from '@prisma/client';
import { getRateStamp } from './rateSnapshot';
import { getEffectiveTouch } from './touchSchedule';
import { writeLog, LogAction } from './activityLog';
import { computePayable } from '@/domain/touchCalc';
import { buildConversionLines } from '@/domain/memoConvert';

export interface ReceiveMemoInLineInput {
  category: string;
  metal: Metal;
  statedPurityPpt: number;
  testedPurityPpt?: number;
  grossMg: number;
  stoneMg?: number;
  netMg: number;
  qty?: number;
  touchPpt?: number;
  alterPolicy?: AlterPolicy;
  tagNo?: string;
}

export interface ReceiveMemoInInput {
  wholesalerVendorId: string;
  wholesalerMemoNo?: string;
  receivedOn?: Date;
  returnByDate: Date;
  notes?: string;
  idempotencyKey: string;
  lines: ReceiveMemoInLineInput[];
}

export async function receiveMemoIn(
  input: ReceiveMemoInInput,
  userId: string
) {
  return db.$transaction(async (tx) => {
    // 1. Generate sequential shop memo number
    const counter = await tx.counter.upsert({
      where: { key: 'memo_in_shop_no' },
      update: { nextValue: { increment: 1 } },
      create: { key: 'memo_in_shop_no', nextValue: 2 },
    });
    const shopMemoNo = `MI-${String(counter.nextValue - 1).padStart(5, '0')}`;

    // 2. Rate stamp
    const stamp = await getRateStamp(new Date(), { tx, allowMissing: true });

    // 3. Create MemoIn header
    const memo = await tx.memoIn.create({
      data: {
        shopId: 'main',
        wholesalerVendorId: input.wholesalerVendorId,
        wholesalerMemoNo: input.wholesalerMemoNo ?? null,
        shopMemoNo,
        receivedOn: input.receivedOn ?? new Date(),
        returnByDate: input.returnByDate,
        notes: input.notes ?? null,
        idempotencyKey: input.idempotencyKey,
        createdById: userId,
      },
    });

    const createdLines = [];

    // 4. Create lines and corresponding MEMO_IN InventoryItems
    for (const [idx, l] of input.lines.entries()) {
      let touchPpt = l.touchPpt;
      let touchSource = 'OVERRIDE';

      if (!touchPpt) {
        const schedule = await getEffectiveTouch(
          input.wholesalerVendorId,
          l.metal,
          l.statedPurityPpt,
          l.category
        );
        touchPpt = schedule?.touchPptDefault ?? l.statedPurityPpt;
        touchSource = 'SCHEDULE';
      }

      const memoLine = await tx.memoInLine.create({
        data: {
          memoInId: memo.id,
          category: l.category,
          metal: l.metal,
          statedPurityPpt: l.statedPurityPpt,
          testedPurityPpt: l.testedPurityPpt ?? l.statedPurityPpt,
          grossMg: l.grossMg,
          stoneMg: l.stoneMg ?? 0,
          netMg: l.netMg,
          qty: l.qty ?? 1,
          touchPpt,
          touchSource,
          alterPolicy: l.alterPolicy ?? 'ALTER_NONE',
          status: 'RECEIVED',
          byUserId: userId,
        },
      });

      // Create linked InventoryItem with ownership = MEMO_IN
      const tagNo = l.tagNo || `${shopMemoNo}-${String(idx + 1).padStart(2, '0')}`;
      const invItem = await tx.inventoryItem.create({
        data: {
          tagNo,
          sku: tagNo,
          name: l.category,
          category: l.category,
          metal: l.metal,
          purityPpt: l.testedPurityPpt ?? l.statedPurityPpt,
          grossWeightMg: l.grossMg,
          netWeightMg: l.netMg,
          ownership: 'MEMO_IN',
          memoInLineId: memoLine.id,
          status: 'IN_STOCK',
          rateSnapshotId: stamp.id,
          createdById: userId,
        },
      });

      // Link inventory item back to line
      const updatedLine = await tx.memoInLine.update({
        where: { id: memoLine.id },
        data: { inventoryItemId: invItem.id },
      });

      createdLines.push(updatedLine);
    }

    // 5. Activity log
    await writeLog({
      tx,
      userId,
      module: 'MEMO_IN',
      action: LogAction.RECEIVE,
      entityType: 'MemoIn',
      entityId: memo.id,
      after: { shopMemoNo, linesCount: createdLines.length },
      rateSnapshotId: stamp.id,
    });

    return { memo, lines: createdLines };
  });
}

export async function markLineOnHold(
  lineId: string,
  params: { customerId?: string; expectedDecisionOn?: Date },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const line = await tx.memoInLine.findUniqueOrThrow({ where: { id: lineId } });

    const updated = await tx.memoInLine.update({
      where: { id: lineId },
      data: {
        status: 'ON_HOLD',
        heldForCustomerId: params.customerId ?? null,
        expectedDecisionOn: params.expectedDecisionOn ?? null,
      },
    });

    if (line.inventoryItemId) {
      await tx.inventoryItem.update({
        where: { id: line.inventoryItemId },
        data: { status: 'ON_HOLD' },
      });
    }

    await writeLog({
      tx,
      userId,
      module: 'MEMO_IN',
      action: LogAction.STATUS_CHANGE,
      entityType: 'MemoInLine',
      entityId: lineId,
      before: { status: line.status },
      after: { status: 'ON_HOLD', heldForCustomerId: params.customerId },
    });

    return updated;
  });
}

export async function returnMemoLine(
  lineId: string,
  reason: string,
  userId: string
) {
  return db.$transaction(async (tx) => {
    const line = await tx.memoInLine.findUniqueOrThrow({ where: { id: lineId } });
    if (line.status === 'SOLD' || line.status === 'LOST') {
      throw new Error(`Cannot return memo line with status ${line.status}`);
    }

    const updated = await tx.memoInLine.update({
      where: { id: lineId },
      data: { status: 'RETURNED' },
    });

    if (line.inventoryItemId) {
      await tx.inventoryItem.update({
        where: { id: line.inventoryItemId },
        data: { status: 'RETURNED_TO_VENDOR' },
      });
    }

    await writeLog({
      tx,
      userId,
      module: 'MEMO_IN',
      action: LogAction.STATUS_CHANGE,
      entityType: 'MemoInLine',
      entityId: lineId,
      before: { status: line.status },
      after: { status: 'RETURNED' },
      reasonText: reason,
    });

    return updated;
  });
}

export async function settleMemoLoss(
  lineId: string,
  params: {
    settlementRatePaisePerGram: bigint;
    reasonCode: string;
    note?: string;
    insuranceClaimRef?: string;
  },
  userId: string
) {
  return db.$transaction(async (tx) => {
    const line = await tx.memoInLine.findUniqueOrThrow({
      where: { id: lineId },
      include: { memoIn: true },
    });

    const payablePaise = computePayable(
      line.netMg,
      line.touchPpt,
      params.settlementRatePaisePerGram
    );

    const loss = await tx.lossSettlement.create({
      data: {
        memoInLineId: lineId,
        wholesalerVendorId: line.memoIn.wholesalerVendorId,
        settlementRatePaisePerGram: params.settlementRatePaisePerGram,
        payablePaise,
        reasonCode: params.reasonCode,
        note: params.note ?? null,
        insuranceClaimRef: params.insuranceClaimRef ?? null,
        byUserId: userId,
      },
    });

    await tx.memoInLine.update({
      where: { id: lineId },
      data: { status: 'LOST', lossSettlementId: loss.id },
    });

    if (line.inventoryItemId) {
      await tx.inventoryItem.update({
        where: { id: line.inventoryItemId },
        data: { status: 'LOST' },
      });
    }

    await writeLog({
      tx,
      userId,
      module: 'MEMO_IN',
      action: LogAction.STATUS_CHANGE,
      entityType: 'MemoInLine',
      entityId: lineId,
      before: { status: line.status },
      after: { status: 'LOST', payablePaise: payablePaise.toString() },
      reasonText: params.note,
    });

    return loss;
  });
}

export interface ConvertMemoSaleInput {
  customerId?: string;
  retailRatePaisePerGram: bigint;
  makingPercentBp: number;
  gstRateBp: number;
  rateMode: RateMode;
  settlementRatePaisePerGram?: bigint;
  idempotencyKey: string;
}

/**
 * Implements §54.2 Conversion Transaction:
 * Atomically flips ownership MEMO_IN -> OWNED, creates Sale + SaleItem,
 * and creates corresponding PurchaseLot / vendor liability.
 */
export async function convertMemoToSale(
  lineId: string,
  input: ConvertMemoSaleInput,
  userId: string
) {
  return db.$transaction(async (tx) => {
    const line = await tx.memoInLine.findUniqueOrThrow({
      where: { id: lineId },
      include: { memoIn: true },
    });

    if (line.status === 'SOLD' || line.status === 'RETURNED' || line.status === 'LOST') {
      throw new Error(`Cannot convert memo line with status ${line.status}`);
    }

    // 1. Domain conversion calculation
    const conversion = buildConversionLines({
      line: {
        id: line.id,
        category: line.category,
        metal: line.metal,
        netMg: line.netMg,
        statedPurityPpt: line.statedPurityPpt,
        testedPurityPpt: line.testedPurityPpt ?? line.statedPurityPpt,
        touchPpt: line.touchPpt,
      },
      salePricing: {
        retailRatePaisePerGram: input.retailRatePaisePerGram,
        makingPercentBp: input.makingPercentBp,
        gstRateBp: input.gstRateBp,
      },
      rateMode: input.rateMode,
      settlementRatePaisePerGram: input.settlementRatePaisePerGram,
    });

    // 2. Generate invoice number
    const counter = await tx.counter.upsert({
      where: { key: 'sale_invoice_no' },
      update: { nextValue: { increment: 1 } },
      create: { key: 'sale_invoice_no', nextValue: 2 },
    });
    const invoiceNo = `INV-${String(counter.nextValue - 1).padStart(6, '0')}`;

    // 3. Create Sale & SaleItem
    const sale = await tx.sale.create({
      data: {
        invoiceNo,
        customerId: input.customerId ?? null,
        date: new Date(),
        subtotalPaise: conversion.customerSale.taxablePaise,
        discountPaise: 0n,
        taxablePaise: conversion.customerSale.taxablePaise,
        gstPaise: conversion.customerSale.gstPaise,
        roundOffPaise: 0n,
        totalPaise: conversion.customerSale.totalPaise,
        paidPaise: conversion.customerSale.totalPaise,
        status: 'COMPLETED',
        idempotencyKey: input.idempotencyKey,
        createdById: userId,
        items: {
          create: {
            inventoryItemId: line.inventoryItemId,
            name: line.category,
            metal: line.metal,
            purityPpt: line.testedPurityPpt ?? line.statedPurityPpt,
            grossWeightMg: line.grossMg,
            netWeightMg: line.netMg,
            ratePaisePerGram: input.retailRatePaisePerGram,
            metalValuePaise: conversion.customerSale.metalValuePaise,
            makingType: 'PERCENT',
            makingValuePaise: BigInt(input.makingPercentBp),
            makingChargePaise: conversion.customerSale.makingPaise,
            totalPaise: conversion.customerSale.totalPaise,
          },
        },
      },
    });

    // 4. Create PurchaseLot for wholesaler liability
    const fineMg = Math.round((line.netMg * (line.testedPurityPpt ?? line.statedPurityPpt)) / 1000);
    const isLocked = input.rateMode === 'LOCKED_AT_SALE';
    const payablePaise = conversion.vendorPayable.payablePaise ?? 0n;

    const purchaseLot = await tx.purchaseLot.create({
      data: {
        vendorId: line.memoIn.wholesalerVendorId,
        basis: isLocked ? 'RUPEE_FIXED' : 'RATE_OPEN',
        totalFineMg: fineMg,
        openFineMg: isLocked ? 0 : fineMg,
        provisionalRatePaise: input.settlementRatePaisePerGram ?? 0n,
        provisionalValuePaise: payablePaise,
        status: isLocked ? 'FIXED' : 'RATE_OPEN',
        rateMode: input.rateMode,
        queuedAt: isLocked ? null : new Date(),
        settledAt: isLocked ? new Date() : null,
        settledRatePaisePerGram: isLocked ? input.settlementRatePaisePerGram : null,
        settledById: isLocked ? userId : null,
        memoInLineId: line.id,
        createdById: userId,
      },
    });

    // 5. Update MemoInLine status and link to Sale & PurchaseLot
    const updatedLine = await tx.memoInLine.update({
      where: { id: line.id },
      data: {
        status: 'SOLD',
        convertedSaleId: sale.id,
        convertedPurchaseInvoiceId: purchaseLot.id,
      },
    });

    // 6. Flip InventoryItem ownership MEMO_IN -> OWNED and status -> SOLD
    if (line.inventoryItemId) {
      await tx.inventoryItem.update({
        where: { id: line.inventoryItemId },
        data: {
          ownership: 'OWNED',
          status: 'SOLD',
        },
      });
    }

    // 7. ActivityLog entry for conversion
    await writeLog({
      tx,
      userId,
      module: 'MEMO_IN',
      action: LogAction.CONVERT,
      entityType: 'MemoInLine',
      entityId: line.id,
      after: {
        saleId: sale.id,
        invoiceNo,
        purchaseLotId: purchaseLot.id,
        rateMode: input.rateMode,
        customerTotal: conversion.customerSale.totalPaise.toString(),
        payablePaise: payablePaise.toString(),
      },
    });

    return { sale, purchaseLot, line: updatedLine, conversion };
  });
}

