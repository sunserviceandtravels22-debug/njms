import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { CustomerTag, RelationType } from '@prisma/client';
import { paiseToRupees } from '@/domain/money';
import { mgToGrams } from '@/domain/weight';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const customer = await db.customer.findUnique({
      where: { id: params.id },
      include: {
        sales: {
          orderBy: { date: 'desc' },
          include: { items: true },
        },
        girviLoans: {
          orderBy: { date: 'desc' },
          include: {
            items: {
              include: { location: true },
            },
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ ok: false, error: 'Customer not found' }, { status: 404 });
    }

    // Extract all girvi loan IDs for this customer
    const girviIds = customer.girviLoans.map((g) => g.id);

    // Fetch repledge links + old-gold vouchers in parallel
    const [repledgeLinks, oldGoldPayments] = await Promise.all([
      girviIds.length > 0
        ? db.repledgeLink.findMany({
            where: { girviId: { in: girviIds } },
            include: { loan: true },
          })
        : Promise.resolve([]),
      // Old-gold vouchers: We find them via ActivityLog for this customer.
      db.activityLog.findMany({
        where: {
          action: 'CREATE_OLD_GOLD_VOUCHER',
        },
        orderBy: { at: 'desc' },
        take: 200,
      }),
    ]);

    // Filter old-gold audit entries that belong to this customer by name or phone
    const myPhone = customer.phone;
    const myName = customer.name.toLowerCase();
    const filteredOGPayments = oldGoldPayments.filter((al: any) => {
      try {
        const after: any = al.after || {};
        const aName = (after.sellerName || '').toLowerCase();
        const aPhone = (after.sellerPhone || '').replace(/\D/g, '');
        return aName === myName || (myPhone && aPhone === myPhone.replace(/\D/g, ''));
      } catch { return false; }
    });

    // Format Sales History
    let totalSalesPaise = BigInt(0);
    const formattedSales = customer.sales.map((s) => {
      totalSalesPaise += s.totalPaise;
      return {
        id: s.id,
        invoiceNo: s.invoiceNo,
        date: s.date.toISOString().split('T')[0],
        totalRupees: paiseToRupees(s.totalPaise),
        totalPaise: s.totalPaise.toString(),
        paidRupees: paiseToRupees(s.paidPaise),
        oldGoldAdjRupees: paiseToRupees(s.oldGoldAdjPaise),
        status: s.status,
        itemsCount: s.items.length,
        items: s.items.map((i) => ({
          name: i.name,
          metal: i.metal,
          grossWeightGrams: mgToGrams(i.grossWeightMg),
          netWeightGrams: mgToGrams(i.netWeightMg),
          totalRupees: paiseToRupees(i.totalPaise),
        })),
      };
    });

    // Format Girvi Loans History
    let activeGirviCount = 0;
    let activeGirviPrincipalPaise = BigInt(0);
    let totalPledgedNetWeightMg = 0;

    const formattedGirvis = customer.girviLoans.map((g) => {
      const isActive = g.status === 'ACTIVE' || g.status === 'PARTIAL';
      if (isActive) {
        activeGirviCount++;
        activeGirviPrincipalPaise += g.principalPaise;
      }

      let loanNetMg = 0;
      let loanValuationPaise = BigInt(0);
      const items = g.items.map((i) => {
        loanNetMg += i.netWeightMg;
        totalPledgedNetWeightMg += i.netWeightMg;
        loanValuationPaise += i.valuationPaise;

        return {
          id: i.id,
          ornamentType: i.ornamentType,
          metal: i.metal,
          purity: i.purity,
          grossWeightGrams: mgToGrams(i.grossWeightMg),
          netWeightGrams: mgToGrams(i.netWeightMg),
          valuationRupees: paiseToRupees(i.valuationPaise),
          locationName: i.location?.name || 'Vault',
        };
      });

      // Find if this specific girvi is repledged
      const linkedRepledges = (repledgeLinks as any[]).filter((rl: any) => rl.girviId === g.id);

      return {
        id: g.id,
        loanNo: g.loanNo,
        date: g.date.toISOString().split('T')[0],
        dueDate: g.dueDate ? g.dueDate.toISOString().split('T')[0] : null,
        principalRupees: paiseToRupees(g.principalPaise),
        principalPaise: g.principalPaise.toString(),
        interestRatePerMonthPct: Number(g.interestRatePerMonthPct),
        status: g.status,
        netWeightGrams: mgToGrams(loanNetMg),
        valuationRupees: paiseToRupees(loanValuationPaise),
        items,
        isRepledged: linkedRepledges.some((r: any) => r.loan?.status === 'ACTIVE' && r.returnedOn === null),
        repledgeInfo: linkedRepledges.map((r: any) => ({
          repledgeLoanNo: r.loan?.loanNo || '',
          financierVendorId: r.loan?.vendorId || '',
          status: r.loan?.status || '',
          sentOn: r.sentOn ? r.sentOn.toISOString().split('T')[0] : null,
          returnedOn: r.returnedOn ? r.returnedOn.toISOString().split('T')[0] : null,
          allocatedRupees: paiseToRupees(r.allocatedPrincipalPaise),
        })),
      };
    });

    // Format Repledged Exposure
    const formattedRepledges = (repledgeLinks as any[]).map((rl: any) => ({
      linkId: rl.id,
      repledgeLoanNo: rl.loan?.loanNo || '',
      girviLoanNo: customer.girviLoans.find((g) => g.id === rl.girviId)?.loanNo || rl.girviId,
      financierVendorId: rl.loan?.vendorId || '',
      weightNetGrams: mgToGrams(rl.weightNetMg),
      allocatedRupees: paiseToRupees(rl.allocatedPrincipalPaise),
      status: rl.loan?.status || '',
      isReturned: rl.returnedOn !== null,
      sentOn: rl.sentOn ? rl.sentOn.toISOString().split('T')[0] : null,
      returnedOn: rl.returnedOn ? rl.returnedOn.toISOString().split('T')[0] : null,
    }));

    // Format Old Gold Vouchers
    const formattedOldGold = (filteredOGPayments as any[]).map((al: any) => {
      const after: any = al.after || {};
      return {
        id: al.id.toString(),
        voucherNo: after.voucherNo || al.entityId,
        date: al.at ? al.at.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        grossWeightGrams: after.grossWeightGrams || 0,
        payableRupees: after.payableRupees || 0,
        sellerName: after.sellerName || customer.name,
      };
    });

    // Customer 360 Summary Metrics
    const summary = {
      totalSalesRupees: paiseToRupees(totalSalesPaise),
      salesCount: customer.sales.length,
      activeGirviCount,
      activeGirviPrincipalRupees: paiseToRupees(activeGirviPrincipalPaise),
      totalPledgedNetWeightGrams: mgToGrams(totalPledgedNetWeightMg),
      activeRepledgedCount: formattedRepledges.filter((r: any) => !r.isReturned && r.status === 'ACTIVE').length,
      oldGoldVouchersCount: formattedOldGold.length,
    };

    return NextResponse.json({
      ok: true,
      data: {
        ...customer,
        creditLimitRupees: paiseToRupees(customer.creditLimitPaise),
        creditLimitPaise: customer.creditLimitPaise.toString(),
        dob: customer.dob ? customer.dob.toISOString().split('T')[0] : null,
        sales: formattedSales,
        girviLoans: formattedGirvis,
        repledges: formattedRepledges,
        oldGoldVouchers: formattedOldGold,
        summary,
      },
    });
  } catch (error: any) {
    console.error('Fetch customer 360 error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch customer 360 profile' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await db.customer.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Customer not found' }, { status: 404 });
    }

    const body = await req.json();
    const {
      name,
      nameHindi,
      phone,
      altPhone,
      dob,
      relationType,
      relationName,
      address,
      city,
      pincode,
      photoUrl,
      photoDriveUrl,
      identityDocType,
      identityDocNumber,
      identityDocPhotoUrl,
      tag,
      notes,
    } = body;

    const updated = await db.customer.update({
      where: { id: params.id },
      data: {
        name: name ? name.trim() : existing.name,
        nameHindi: nameHindi !== undefined ? nameHindi?.trim() || null : existing.nameHindi,
        phone: phone ? phone.trim() : existing.phone,
        altPhone: altPhone !== undefined ? altPhone?.trim() || null : existing.altPhone,
        dob: dob ? new Date(dob) : existing.dob,
        relationType: relationType ? (relationType as RelationType) : existing.relationType,
        relationName: relationName !== undefined ? relationName?.trim() || null : existing.relationName,
        address: address !== undefined ? address?.trim() || null : existing.address,
        city: city !== undefined ? city?.trim() || 'Local' : existing.city,
        pincode: pincode !== undefined ? pincode?.trim() || null : existing.pincode,
        photoUrl: photoUrl !== undefined ? photoUrl?.trim() || null : existing.photoUrl,
        photoDriveUrl: photoDriveUrl !== undefined ? photoDriveUrl?.trim() || null : existing.photoDriveUrl,
        identityDocType: identityDocType !== undefined ? identityDocType?.trim() || null : existing.identityDocType,
        identityDocNumber: identityDocNumber !== undefined ? identityDocNumber?.trim() || null : existing.identityDocNumber,
        identityDocPhotoUrl: identityDocPhotoUrl !== undefined ? identityDocPhotoUrl?.trim() || null : existing.identityDocPhotoUrl,
        tag: tag ? (tag as CustomerTag) : existing.tag,
        notes: notes !== undefined ? notes?.trim() || null : existing.notes,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'UPDATE_CUSTOMER',
      entity: 'Customer',
      entityId: updated.id,
      before: existing,
      after: updated,
    });

    return NextResponse.json({ ok: true, data: updated });
  } catch (error: any) {
    console.error('Update customer error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to update customer' }, { status: 500 });
  }
}
