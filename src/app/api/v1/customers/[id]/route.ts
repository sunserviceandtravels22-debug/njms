import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { CustomerTag, RelationType } from '@prisma/client';

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
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            invoiceNo: true,
            date: true,
            totalPaise: true,
            status: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ ok: false, error: 'Customer not found' }, { status: 404 });
    }

    const formattedSales = customer.sales.map((s: any) => ({
      ...s,
      totalPaise: s.totalPaise.toString(),
    }));

    return NextResponse.json({
      ok: true,
      data: {
        ...customer,
        creditLimitPaise: customer.creditLimitPaise.toString(),
        dob: customer.dob ? customer.dob.toISOString().split('T')[0] : null,
        sales: formattedSales,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch customer' }, { status: 500 });
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
      creditLimitPaise,
      notes,
      pinVerified,
    } = body;

    const isIdentityChange =
      (name && name !== existing.name) ||
      (phone && phone !== existing.phone) ||
      (relationName && relationName !== existing.relationName);

    if (isIdentityChange && user.role === 'STAFF' && !pinVerified) {
      return NextResponse.json(
        { ok: false, error: 'PIN verification required to update core customer identity', requiresPin: true },
        { status: 403 }
      );
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : existing.phone;

    const updated = await db.customer.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        nameHindi: nameHindi !== undefined ? (nameHindi?.trim() || null) : existing.nameHindi,
        phone: cleanPhone,
        altPhone: altPhone !== undefined ? (altPhone?.replace(/\D/g, '') || null) : existing.altPhone,
        dob: dob !== undefined ? (dob ? new Date(dob) : null) : existing.dob,
        relationType: relationType !== undefined ? (relationType as RelationType) : existing.relationType,
        relationName: relationName !== undefined ? (relationName?.trim() || null) : existing.relationName,
        address: address !== undefined ? (address?.trim() || null) : existing.address,
        city: city !== undefined ? city.trim() : existing.city,
        pincode: pincode !== undefined ? (pincode?.trim() || null) : existing.pincode,
        photoUrl: photoUrl !== undefined ? photoUrl : existing.photoUrl,
        photoDriveUrl: photoDriveUrl !== undefined ? photoDriveUrl?.trim() : existing.photoDriveUrl,
        identityDocType: identityDocType !== undefined ? identityDocType?.trim() : existing.identityDocType,
        identityDocNumber: identityDocNumber !== undefined ? identityDocNumber?.trim() : existing.identityDocNumber,
        identityDocPhotoUrl: identityDocPhotoUrl !== undefined ? identityDocPhotoUrl : existing.identityDocPhotoUrl,
        tag: tag !== undefined ? (tag as CustomerTag) : existing.tag,
        creditLimitPaise: creditLimitPaise !== undefined ? BigInt(creditLimitPaise) : existing.creditLimitPaise,
        notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'UPDATE_CUSTOMER',
      entity: 'Customer',
      entityId: updated.id,
      before: { name: existing.name, phone: existing.phone, tag: existing.tag },
      after: { name: updated.name, phone: updated.phone, tag: updated.tag },
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...updated,
        creditLimitPaise: updated.creditLimitPaise.toString(),
        dob: updated.dob ? updated.dob.toISOString().split('T')[0] : null,
      },
    });
  } catch (error: any) {
    console.error('Update customer error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'OWNER' && user.role !== 'MANAGER') {
      return NextResponse.json({ ok: false, error: 'Only Owner or Manager can delete customers' }, { status: 403 });
    }

    const salesCount = await db.sale.count({ where: { customerId: params.id } });
    if (salesCount > 0) {
      return NextResponse.json(
        { ok: false, error: 'Cannot delete customer with existing sales history. Tag customer as BLOCKED instead.' },
        { status: 400 }
      );
    }

    const deleted = await db.customer.delete({ where: { id: params.id } });

    await writeAuditLog({
      userId: user.id,
      action: 'DELETE_CUSTOMER',
      entity: 'Customer',
      entityId: params.id,
      before: { name: deleted.name, phone: deleted.phone },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: 'Failed to delete customer' }, { status: 500 });
  }
}
