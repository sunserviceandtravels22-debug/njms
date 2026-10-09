import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/server/auth';
import { writeAuditLog } from '@/server/audit';
import { db } from '@/server/db';
import { CustomerTag, RelationType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim() || '';
    const tag = searchParams.get('tag') as CustomerTag | null;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (tag) {
      whereClause.tag = tag;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { nameHindi: { contains: search } },
        { phone: { contains: search } },
        { altPhone: { contains: search } },
        { relationName: { contains: search } },
        { identityDocNumber: { contains: search } },
      ];
    }

    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.customer.count({ where: whereClause }),
    ]);

    const formatted = customers.map((c: any) => ({
      ...c,
      creditLimitPaise: c.creditLimitPaise.toString(),
      dob: c.dob ? c.dob.toISOString().split('T')[0] : null,
    }));

    return NextResponse.json({
      ok: true,
      data: formatted,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Fetch customers error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch customers' }, { status: 500 });
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
      nameHindi,
      phone,
      altPhone,
      dob,
      relationType,
      relationName,
      address,
      city = 'Local',
      pincode,
      photoUrl,
      photoDriveUrl,
      identityDocType,
      identityDocNumber,
      identityDocPhotoUrl,
      tag = 'STANDARD',
      creditLimitPaise = 0,
      notes,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ ok: false, error: 'Customer name is required' }, { status: 400 });
    }

    const cleanPhone = phone?.replace(/\D/g, '') || '';
    if (!cleanPhone || cleanPhone.length < 10) {
      return NextResponse.json({ ok: false, error: 'Valid 10-digit phone number is required' }, { status: 400 });
    }

    const newCustomer = await db.customer.create({
      data: {
        name: name.trim(),
        nameHindi: nameHindi?.trim() || null,
        phone: cleanPhone,
        altPhone: altPhone?.replace(/\D/g, '') || null,
        dob: dob ? new Date(dob) : null,
        relationType: (relationType as RelationType) || 'FATHER',
        relationName: relationName?.trim() || null,
        address: address?.trim() || null,
        city: city.trim(),
        pincode: pincode?.trim() || null,
        photoUrl: photoUrl || null,
        photoDriveUrl: photoDriveUrl?.trim() || null,
        identityDocType: identityDocType?.trim() || null,
        identityDocNumber: identityDocNumber?.trim() || null,
        identityDocPhotoUrl: identityDocPhotoUrl || null,
        tag: (tag as CustomerTag) || 'STANDARD',
        creditLimitPaise: BigInt(creditLimitPaise || 0),
        notes: notes?.trim() || null,
        createdById: user.id,
      },
    });

    await writeAuditLog({
      userId: user.id,
      action: 'CREATE_CUSTOMER',
      entity: 'Customer',
      entityId: newCustomer.id,
      after: {
        id: newCustomer.id,
        name: newCustomer.name,
        phone: newCustomer.phone,
        relationName: newCustomer.relationName,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        ...newCustomer,
        creditLimitPaise: newCustomer.creditLimitPaise.toString(),
        dob: newCustomer.dob ? newCustomer.dob.toISOString().split('T')[0] : null,
      },
    });
  } catch (error: any) {
    console.error('Create customer error:', error);
    return NextResponse.json({ ok: false, error: error.message || 'Failed to create customer' }, { status: 500 });
  }
}
