import { PrismaClient, Role, FundType, CashGroup, LocationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.SEED_OWNER_USERNAME || 'owner';
  const password = process.env.SEED_OWNER_PASSWORD || 'OwnerSecurePassword123!';
  const name = process.env.SEED_OWNER_NAME || 'Narayan Jewellers Owner';
  const pin = process.env.SEED_OWNER_PIN || '1234';

  console.log(`Seeding initial Owner user (${username})...`);

  const passwordHash = await bcrypt.hash(password, 12);
  const pinHash = await bcrypt.hash(pin + (process.env.PIN_PEPPER || ''), 10);

  const owner = await prisma.user.upsert({
    where: { username },
    update: {
      passwordHash,
      pinHash,
      active: true,
    },
    create: {
      username,
      name,
      role: Role.OWNER,
      passwordHash,
      pinHash,
      lang: 'en',
    },
  });

  console.log(`Owner user ready: ${owner.username} (${owner.id})`);

  // Default Shop & Financial Settings per PRD FR-PLT-04
  const defaultSettings = [
    {
      key: 'shop.profile',
      value: {
        name: 'Narayan Jewellers',
        address: 'Main Bazaar, Jewellery Market',
        phone: '+91 98765 43210',
        gstin: '07AAAAA0000A1Z5',
      },
    },
    {
      key: 'gst.settings',
      value: {
        enabled: true,
        jewelleryBp: 300, // 3%
        makingBp: 500, // 5%
      },
    },
    {
      key: 'interest.defaults',
      value: {
        goldBpMonthly: 200, // 2% per month
        silverBpMonthly: 250, // 2.5% per month
        defaultCompounding: 'MONTHLY',
      },
    },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value, updatedById: owner.id },
    });
  }

  // 1. Default Fund Accounts (Cash in Hand & Bank)
  console.log('Seeding default Fund Accounts...');
  const cashAccount = await prisma.fundAccount.upsert({
    where: { id: 'fund_cash_default' },
    update: {},
    create: {
      id: 'fund_cash_default',
      name: 'Cash in Hand (Counter Drawer)',
      type: FundType.CASH,
      acceptsModes: ['CASH'],
      openingPaise: BigInt(0),
      openingDate: new Date('2026-01-01'),
      sortOrder: 1,
    },
  });

  const bankAccount = await prisma.fundAccount.upsert({
    where: { id: 'fund_bank_default' },
    update: {},
    create: {
      id: 'fund_bank_default',
      name: 'Main Bank Account / UPI',
      type: FundType.BANK,
      bankName: 'State Bank of India',
      accountLast4: '4589',
      upiId: 'narayanjewellers@sbi',
      acceptsModes: ['UPI', 'BANK', 'CARD'],
      isDefaultUpi: true,
      openingPaise: BigInt(0),
      openingDate: new Date('2026-01-01'),
      sortOrder: 2,
    },
  });

  // 2. Default Cash Categories
  console.log('Seeding default Cash Categories...');
  const defaultCategories = [
    // OPERATING Expense
    { name: 'Tea & Refreshments', nameHi: 'चाय पानी नाश्ता', group: CashGroup.OPERATING, direction: 'OUT', pnl: 'EXPENSE' },
    { name: 'Rent', nameHi: 'दुकान का किराया', group: CashGroup.OPERATING, direction: 'OUT', pnl: 'EXPENSE' },
    { name: 'Salary & Wages', nameHi: 'स्टाफ वेतन', group: CashGroup.OPERATING, direction: 'OUT', pnl: 'EXPENSE' },
    { name: 'Electricity & Bills', nameHi: 'बिजली का बिल', group: CashGroup.OPERATING, direction: 'OUT', pnl: 'EXPENSE' },
    { name: 'Transport & Fuel', nameHi: 'पेट्रोल और किराया', group: CashGroup.OPERATING, direction: 'OUT', pnl: 'EXPENSE' },
    { name: 'Packing & Stationery', nameHi: 'पैकिंग और स्टेशनरी', group: CashGroup.OPERATING, direction: 'OUT', pnl: 'EXPENSE' },
    { name: 'Miscellaneous Expense', nameHi: 'अन्य खर्चा', group: CashGroup.OPERATING, direction: 'OUT', pnl: 'EXPENSE' },

    // OPERATING Income
    { name: 'Sales Receipts', nameHi: 'बिक्री प्राप्ति', group: CashGroup.OPERATING, direction: 'IN', isSystem: true, pnl: 'INCOME' },
    { name: 'Credit Collection', nameHi: 'उधार वसूली', group: CashGroup.OPERATING, direction: 'IN', isSystem: true, pnl: 'INCOME' },
    { name: 'Other Income', nameHi: 'अन्य आय', group: CashGroup.OPERATING, direction: 'IN', pnl: 'INCOME' },

    // METAL & GIRVI
    { name: 'Girvi Loans Given', nameHi: 'गिरवी ऋण दिया', group: CashGroup.GIRVI, direction: 'OUT', isSystem: true },
    { name: 'Girvi Principal Received', nameHi: 'गिरवी मूलधन प्राप्त', group: CashGroup.GIRVI, direction: 'IN', isSystem: true },
    { name: 'Girvi Interest Received', nameHi: 'गिरवी ब्याज प्राप्त', group: CashGroup.GIRVI, direction: 'IN', isSystem: true, pnl: 'INCOME' },
    { name: 'Old Gold Payouts', nameHi: 'पुराना सोना भुगतान', group: CashGroup.METAL, direction: 'OUT', isSystem: true },
    { name: 'Karigar Labour Paid', nameHi: 'कारीगर मजदूरी', group: CashGroup.METAL, direction: 'OUT' },

    // FINANCING
    { name: 'Owner Capital Introduced', nameHi: 'मालिक पूंजी जमा', group: CashGroup.FINANCING, direction: 'IN', isPersonal: true },
    { name: 'Owner Drawings (Personal)', nameHi: 'मालिक निजी निकासी', group: CashGroup.FINANCING, direction: 'OUT', isPersonal: true },

    // TRANSFER
    { name: 'Cash Deposited to Bank', nameHi: 'बैंक में कैश जमा', group: CashGroup.TRANSFER, direction: 'OUT', isSystem: true },
    { name: 'Cash Withdrawn from Bank', nameHi: 'बैंक से कैश निकासी', group: CashGroup.TRANSFER, direction: 'IN', isSystem: true },
  ];

  for (let i = 0; i < defaultCategories.length; i++) {
    const cat = defaultCategories[i];
    const existing = await prisma.cashCategory.findFirst({
      where: {
        shopId: 'main',
        name: cat.name,
        parentId: null,
      },
    });

    if (existing) {
      await prisma.cashCategory.update({
        where: { id: existing.id },
        data: { nameHi: cat.nameHi },
      });
    } else {
      await prisma.cashCategory.create({
        data: {
          shopId: 'main',
          name: cat.name,
          nameHi: cat.nameHi,
          group: cat.group,
          direction: cat.direction,
          isSystem: cat.isSystem || false,
          isPersonal: cat.isPersonal || false,
          pnl: cat.pnl || 'NONE',
          sortOrder: i + 1,
        },
      });
    }
  }

  // 3. Default Storage Locations for Girvi & Custody
  console.log('Seeding default Storage Locations...');
  const defaultLocations = [
    { name: 'Counter Drawer (Shop)', type: LocationType.SHOP_DRAWER, isSystem: true, sortOrder: 1 },
    { name: 'Main Vault / Safe', type: LocationType.VAULT, isSystem: true, sortOrder: 2 },
    { name: 'Home Safe (Owner)', type: LocationType.HOME, requiresPinIn: true, requiresPinOut: true, isSystem: true, sortOrder: 3 },
    { name: 'In Transit', type: LocationType.TRANSIT, isSystem: true, sortOrder: 4 },
  ];

  for (const loc of defaultLocations) {
    const existingLoc = await prisma.storageLocation.findFirst({
      where: { name: loc.name },
    });
    if (!existingLoc) {
      await prisma.storageLocation.create({
        data: {
          shopId: 'main',
          name: loc.name,
          type: loc.type,
          requiresPinIn: loc.requiresPinIn || false,
          requiresPinOut: loc.requiresPinOut || false,
          isSystem: loc.isSystem,
          sortOrder: loc.sortOrder,
        },
      });
    }
  }

  console.log('Cash Flow & Storage Locations seeded successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
