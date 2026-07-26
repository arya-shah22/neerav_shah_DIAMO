import { PrismaClient, StockStatus, ChallanPurpose, ChallanStatus, InvoiceStatus, PaymentStatus, CashBankType, PaymentMode, StockCategory } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper random utilities for generating variety
const randomChoice = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number, decimals = 3): number => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));

const SHAPES = ['ROUND', 'OVAL', 'CUSHION', 'PEAR', 'EMERALD', 'PRINCESS', 'MARQUISE', 'RADIANT', 'HEART'];
const COLORS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'Fancy Pink', 'Fancy Yellow'];
const CLARITIES = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2'];
const CUTS = ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'FAIR'];
const POLISH_SYMMETRY = ['EXCELLENT', 'VERY_GOOD', 'GOOD'];
const CERT_TYPES = ['GIA', 'IGI', 'HRD', 'SGL', 'NONE'];

async function cleanAndSeed() {
  console.log('🧹 Truncating existing transactional and master data...');

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  const tablesToTruncate = [
    'audit_logs',
    'app_notifications',
    'page_permissions',
    'module_permissions',
    'user_company_access',
    'user_sessions',
    'general_ledger_entries',
    'cash_bank_allocations',
    'cash_bank_vouchers',
    'journal_voucher_lines',
    'journal_vouchers',
    'job_cost_entries',
    'job_voucher_items',
    'job_vouchers',
    'stock_conversion_outputs',
    'stock_conversions',
    'stock_reservations',
    'stock_media',
    'stock_movements',
    'challan_items',
    'challan_vouchers',
    'sale_invoice_items',
    'sale_invoices',
    'purchase_invoice_items',
    'purchase_invoices',
    'stock_packets',
    'qualities',
    'accounts',
    'account_groups',
    'system_settings',
    'backup_records',
    'financial_years',
    'companies',
  ];

  for (const table of tablesToTruncate) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
    } catch (e) {
      await prisma.$executeRawUnsafe(`DELETE FROM \`${table}\`;`);
    }
  }

  // Purge duplicate legacy admin account handle
  await prisma.$executeRawUnsafe("DELETE FROM user_company_access WHERE user_id IN (SELECT id FROM users WHERE user_id_handle = 'admin');");
  await prisma.$executeRawUnsafe("DELETE FROM users WHERE user_id_handle = 'admin';");

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('✅ Truncation complete!\n');

  console.log('🌱 Seeding fresh demo data (Master pages: ~5 entries | Transactional pages: 50 entries each)...');

  // ─── 1. COMPANIES (2 Simple Companies) ────────────────────────
  const company1 = await prisma.company.create({
    data: {
      companyName: 'DIAMO EXPORTS LTD',
      companyCode: 'DST',
      city: 'Surat',
      stateCode: '24',
      country: 'India',
      addressLine1: '101, Diamond Tower, Ring Road',
      mobile: '9825012345',
      gstinNumber: '24AABCD1234E1ZP',
      panNumber: 'AABCD1234E',
    },
  });

  const company2 = await prisma.company.create({
    data: {
      companyName: 'SURAT GEMS PVT LTD',
      companyCode: 'SGL',
      city: 'Surat',
      stateCode: '24',
      country: 'India',
      addressLine1: '402, Varachha Main Road',
      mobile: '9898054321',
      gstinNumber: '24XYZAB5678F1ZQ',
      panNumber: 'XYZAB5678F',
    },
  });
  console.log('   ✅ 2 Companies created');

  // ─── 1.5. USERS & STAFF ACCOUNTS ──────────────────────────────
  const passwordHash = bcrypt.hashSync('Admin@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { userIdHandle: 'aryashah' },
    update: {
      isSuperAdmin: true,
      status: 'ACTIVE',
      employeeCode: 'EMP-100',
      department: 'Executive Board',
      designation: 'Chief Executive Officer',
    },
    create: {
      userIdHandle: 'aryashah',
      fullName: 'Arya Shah',
      email: 'admin@diamo.com',
      mobile: '9825000000',
      passwordHash,
      isSuperAdmin: true,
      employeeCode: 'EMP-100',
      department: 'Executive Board',
      designation: 'Chief Executive Officer',
      status: 'ACTIVE',
    },
  });

  const staffUsers = [
    { code: 'EMP-101', handle: 'siddharth', name: 'Siddharth Patel', email: 'siddharth@diamo.com', mobile: '9825111111', dept: 'Finance & Accounts', desg: 'Chief Accountant' },
    { code: 'EMP-102', handle: 'priyamehta', name: 'Priya Mehta', email: 'priya@diamo.com', mobile: '9825222222', dept: 'Sales & Trading', desg: 'Senior Sales Manager' },
    { code: 'EMP-103', handle: 'rajeshv', name: 'Rajesh Verma', email: 'rajesh@diamo.com', mobile: '9825333333', dept: 'Inventory Vault', desg: 'Stock Controller' },
    { code: 'EMP-104', handle: 'ketanshah', name: 'Ketan Shah', email: 'ketan@diamo.com', mobile: '9825444444', dept: 'Job Work & Polishing', desg: 'Production Supervisor' },
    { code: 'EMP-105', handle: 'anjalidesai', name: 'Anjali Desai', email: 'anjali@diamo.com', mobile: '9825555555', dept: 'Accounts & GST', desg: 'Senior Billing Officer' },
  ];

  for (const s of staffUsers) {
    const user = await prisma.user.upsert({
      where: { userIdHandle: s.handle },
      update: { status: 'ACTIVE' },
      create: {
        userIdHandle: s.handle,
        fullName: s.name,
        email: s.email,
        mobile: s.mobile,
        passwordHash,
        isSuperAdmin: false,
        employeeCode: s.code,
        department: s.dept,
        designation: s.desg,
        status: 'ACTIVE',
      },
    });

    await prisma.userCompanyAccess.deleteMany({ where: { userId: user.id } });
    await prisma.userCompanyAccess.createMany({
      data: [
        { userId: user.id, companyId: company1.id },
        { userId: user.id, companyId: company2.id },
      ],
    });
  }

  await prisma.userCompanyAccess.deleteMany({ where: { userId: adminUser.id } });
  await prisma.userCompanyAccess.createMany({
    data: [
      { userId: adminUser.id, companyId: company1.id },
      { userId: adminUser.id, companyId: company2.id },
    ],
  });
  console.log('   ✅ Staff & Employee User Accounts created');

  // ─── 2. FINANCIAL YEARS ───────────────────────────────────────
  const fy1 = await prisma.financialYear.create({
    data: {
      companyId: company1.id,
      fromDate: new Date('2026-04-01'),
      toDate: new Date('2027-03-31'),
      isActive: true,
      isClosed: false,
    },
  });

  const fy2 = await prisma.financialYear.create({
    data: {
      companyId: company2.id,
      fromDate: new Date('2026-04-01'),
      toDate: new Date('2027-03-31'),
      isActive: true,
      isClosed: false,
    },
  });
  console.log('   ✅ Financial Years created');

  // ─── 3. ACCOUNT GROUPS (Master) ───────────────────────────────
  const gSundryDebtors = await prisma.accountGroup.create({
    data: { companyId: company1.id, groupName: 'Sundry Debtors', nature: 'ASSET', sortOrder: 1 },
  });
  const gSundryCreditors = await prisma.accountGroup.create({
    data: { companyId: company1.id, groupName: 'Sundry Creditors', nature: 'LIABILITY', sortOrder: 2 },
  });
  const gJobWorkers = await prisma.accountGroup.create({
    data: { companyId: company1.id, groupName: 'Job Workers', nature: 'LIABILITY', sortOrder: 3 },
  });
  const gBankAccounts = await prisma.accountGroup.create({
    data: { companyId: company1.id, groupName: 'Bank Accounts', nature: 'ASSET', sortOrder: 4 },
  });
  const gCashAccounts = await prisma.accountGroup.create({
    data: { companyId: company1.id, groupName: 'Cash-in-Hand', nature: 'ASSET', sortOrder: 5 },
  });
  const gSales = await prisma.accountGroup.create({
    data: { companyId: company1.id, groupName: 'Sales Accounts', nature: 'INCOME', sortOrder: 6 },
  });
  const gPurchase = await prisma.accountGroup.create({
    data: { companyId: company1.id, groupName: 'Purchase Accounts', nature: 'EXPENSE', sortOrder: 7 },
  });
  const gDirectExp = await prisma.accountGroup.create({
    data: { companyId: company1.id, groupName: 'Direct Expenses', nature: 'EXPENSE', sortOrder: 8 },
  });
  const gBrokers = await prisma.accountGroup.create({
    data: { companyId: company1.id, groupName: 'Diamond Brokers', nature: 'EXPENSE', sortOrder: 9 },
  });
  console.log('   ✅ Account Groups created');

  // ─── 4. ACCOUNTS / PARTIES (Master: ~6 clean parties + Brokers) ───
  const customerParties = [];
  const customerNames = [
    { name: 'Vishwa Diamond Traders', city: 'Surat', mobile: '9427270999' },
    { name: 'Shreeji Jewels Pvt Ltd', city: 'Mumbai', mobile: '9820011223' },
    { name: 'Navkar Diamond House', city: 'Ahmedabad', mobile: '9426055443' },
    { name: 'Blue Nile Exports', city: 'Mumbai', mobile: '9879012345' },
  ];
  for (const c of customerNames) {
    const party = await prisma.account.create({
      data: {
        companyId: company1.id,
        accountGroupId: gSundryDebtors.id,
        accountName: c.name,
        printName: c.name,
        city: c.city,
        mobile: c.mobile,
        creditDays: 30,
        creditLimit: 5000000,
      },
    });
    customerParties.push(party);
  }

  const supplierParties = [];
  const supplierNames = [
    { name: 'Arya Enterprise', city: 'Mumbai', mobile: '7405201222' },
    { name: 'De Beers Sight Supplier', city: 'Antwerp', mobile: '9876543210' },
    { name: 'Kothari Rough Diamonds', city: 'Surat', mobile: '9825123456' },
  ];
  for (const s of supplierNames) {
    const party = await prisma.account.create({
      data: {
        companyId: company1.id,
        accountGroupId: gSundryCreditors.id,
        accountName: s.name,
        printName: s.name,
        city: s.city,
        mobile: s.mobile,
        creditDays: 45,
      },
    });
    supplierParties.push(party);
  }

  const workerParties = [];
  const workerNames = [
    { name: 'Neerav Shah (Polisher)', city: 'Surat', mobile: '7405501227' },
    { name: 'Kiran Laser & Cutting Works', city: 'Surat', mobile: '9898112233' },
  ];
  for (const w of workerNames) {
    const party = await prisma.account.create({
      data: {
        companyId: company1.id,
        accountGroupId: gJobWorkers.id,
        accountName: w.name,
        printName: w.name,
        city: w.city,
        mobile: w.mobile,
      },
    });
    workerParties.push(party);
  }

  const brokerParties = [];
  const brokerNames = [
    { name: 'Babulal Mehta (Broker)', city: 'Surat', mobile: '9825199887' },
    { name: 'Rameshchandra & Sons Brokerage', city: 'Mumbai', mobile: '9820155443' },
    { name: 'Surat Diamond Brokers Co.', city: 'Surat', mobile: '9898077665' },
  ];
  for (const b of brokerNames) {
    const party = await prisma.account.create({
      data: {
        companyId: company1.id,
        accountGroupId: gBrokers.id,
        accountName: b.name,
        printName: b.name,
        city: b.city,
        mobile: b.mobile,
        isBroker: true,
      },
    });
    brokerParties.push(party);
  }

  const accHdfc = await prisma.account.create({
    data: {
      companyId: company1.id,
      accountGroupId: gBankAccounts.id,
      accountName: 'HDFC Bank Ltd - Current A/c',
      city: 'Surat',
      bankAccountNumber: '50200012345678',
      bankIfsc: 'HDFC0000123',
      openingBalanceAmount: 2500000,
      openingBalanceType: 'DEBIT',
    },
  });
  const accIcici = await prisma.account.create({
    data: {
      companyId: company1.id,
      accountGroupId: gBankAccounts.id,
      accountName: 'ICICI Bank - Export A/c',
      city: 'Surat',
      bankAccountNumber: '60300098765432',
      bankIfsc: 'ICIC0000456',
      openingBalanceAmount: 1500000,
      openingBalanceType: 'DEBIT',
    },
  });
  const accCash = await prisma.account.create({
    data: {
      companyId: company1.id,
      accountGroupId: gCashAccounts.id,
      accountName: 'Main Cash Account',
      openingBalanceAmount: 500000,
      openingBalanceType: 'DEBIT',
    },
  });
  const accSales = await prisma.account.create({
    data: { companyId: company1.id, accountGroupId: gSales.id, accountName: 'Sales - Diamonds' },
  });
  const accPurchase = await prisma.account.create({
    data: { companyId: company1.id, accountGroupId: gPurchase.id, accountName: 'Purchase - Rough Diamonds' },
  });
  const accLabour = await prisma.account.create({
    data: { companyId: company1.id, accountGroupId: gDirectExp.id, accountName: 'Job Work Processing Charges' },
  });
  console.log('   ✅ Master Accounts & Parties created');

  // ─── 5. DIAMOND QUALITIES (Master: ~5 qualities) ───────────────
  const qualitiesList = [];
  const qData = [
    { code: 'ROUGH-SIGHT-01', name: 'Rough Diamond Sight Packet', hsn: '71023910' },
    { code: 'POL-RND-EX', name: 'Round Brilliant Triple EX', hsn: '71023920' },
    { code: 'POL-OVL-VG', name: 'Oval Fancy Shape VG', hsn: '71023920' },
    { code: 'POL-CSH-EX', name: 'Cushion Cut Premium', hsn: '71042010' },
    { code: 'LGD-CSH-01', name: 'Lab Grown Cushion Cut', hsn: '71042010' },
  ];
  for (const q of qData) {
    const quality = await prisma.quality.create({
      data: {
        companyId: company1.id,
        itemCode: q.code,
        qualityName: q.name,
        hsnNumber: q.hsn,
      },
    });
    qualitiesList.push(quality);
  }
  console.log('   ✅ Master Diamond Qualities created');

  // ─── 6. STOCK INVENTORY (50 Stock Packets) ─────────────────────
  console.log('📦 Seeding 50 Stock Inventory entries...');
  const stockPackets = [];
  const statuses: StockStatus[] = [StockStatus.AVAILABLE, StockStatus.AVAILABLE, StockStatus.JOB_WORK, StockStatus.HOLD, StockStatus.PROCESSED, StockStatus.SOLD];

  for (let i = 1; i <= 50; i++) {
    const q = randomChoice(qualitiesList);
    const shape = randomChoice(SHAPES);
    const color = randomChoice(COLORS);
    const clarity = randomChoice(CLARITIES);
    const cut = randomChoice(CUTS);
    const carats = randomFloat(0.30, 25.50, 3);
    const pcs = randomInt(1, 15);
    const costPerCarat = randomInt(1500, 12000);
    const totalCost = carats * costPerCarat;
    const category: StockCategory = i % 3 === 0 ? 'CERTIFIED' : 'NON_CERTIFIED';
    const certType = category === 'CERTIFIED' ? randomChoice(CERT_TYPES.filter(c => c !== 'NONE')) : null;
    const certNo = certType ? `24${randomInt(10000000, 99999999)}` : null;
    const status = randomChoice(statuses);

    const pkt = await prisma.stockPacket.create({
      data: {
        companyId: company1.id,
        qualityId: q.id,
        stockIdNumber: `DST-PKT-2627-${String(i).padStart(6, '0')}`,
        category,
        registrationDate: new Date(2026, 3, randomInt(1, 28)),
        shape,
        caratWeight: carats,
        pieceCount: pcs,
        color,
        clarity,
        cut,
        polish: randomChoice(POLISH_SYMMETRY),
        symmetry: randomChoice(POLISH_SYMMETRY),
        certificateType: certType,
        certificateNumber: certNo,
        costPerCarat,
        totalCost,
        targetSaleRate: parseFloat((costPerCarat * 1.25).toFixed(2)),
        currentStatus: status,
      },
    });
    stockPackets.push(pkt);
  }
  console.log('   ✅ 50 Stock Inventory entries created');

  // ─── 7. PURCHASE BOOK (50 Purchase Invoices) ───────────────────
  console.log('📥 Seeding 50 Purchase Book entries...');
  const purchaseInvoices = [];
  for (let i = 1; i <= 50; i++) {
    const supplier = randomChoice(supplierParties);
    const broker = i % 3 === 0 ? randomChoice(brokerParties) : null;
    const pkt = stockPackets[i - 1];
    const carats = Number(pkt.caratWeight);
    const grossAmt = Number(pkt.totalCost);
    const isInterstate = i % 3 === 0;
    const cgstAmt = isInterstate ? 0 : parseFloat((grossAmt * 0.0075).toFixed(2));
    const sgstAmt = isInterstate ? 0 : parseFloat((grossAmt * 0.0075).toFixed(2));
    const igstAmt = isInterstate ? parseFloat((grossAmt * 0.015).toFixed(2)) : 0;
    const tdsAmt = parseFloat((grossAmt * 0.001).toFixed(2)); // 0.1% TDS Section 194Q
    const gstAmt = cgstAmt + sgstAmt + igstAmt;
    const netAmt = grossAmt + gstAmt - tdsAmt;
    const pStatus: PaymentStatus = i % 3 === 0 ? 'PAID' : (i % 2 === 0 ? 'PARTIAL' : 'UNPAID');
    const jamaAmt = pStatus === 'PAID' ? netAmt : (pStatus === 'PARTIAL' ? parseFloat((netAmt / 2).toFixed(2)) : 0);
    const outstanding = netAmt - jamaAmt;

    const pur = await prisma.purchaseInvoice.create({
      data: {
        companyId: company1.id,
        financialYearId: fy1.id,
        voucherNumber: `DST-2627-PUR-${String(i).padStart(6, '0')}`,
        billNumber: `BILL-SUP-${supplier.id}-${String(i).padStart(4, '0')}`,
        invoiceDate: new Date(2026, randomInt(3, 6), randomInt(1, 28)),
        supplierId: supplier.id,
        brokerId: broker ? broker.id : null,
        totalCarats: carats,
        totalPieces: pkt.pieceCount,
        totalGrossAmount: grossAmt,
        totalCgst: cgstAmt,
        totalSgst: sgstAmt,
        totalIgst: igstAmt,
        totalTds: tdsAmt,
        tdsSection: '194Q',
        tdsRate: 0.1,
        netAmount: netAmt,
        jamaAmount: jamaAmt,
        outstandingAmount: outstanding,
        paymentStatus: pStatus,
        status: 'SAVED',
        items: {
          create: [
            {
              rowNumber: 1,
              qualityId: pkt.qualityId,
              hsnNumber: '71023920',
              carats,
              pieces: pkt.pieceCount,
              rate: pkt.costPerCarat,
              grossAmount: grossAmt,
              cgstAmount: cgstAmt,
              sgstAmount: sgstAmt,
              igstAmount: igstAmt,
              netAmount: grossAmt + gstAmt,
              stockPacketId: pkt.id,
            },
          ],
        },
      },
    });
    purchaseInvoices.push(pur);
  }
  console.log('   ✅ 50 Purchase Book entries created');

  // ─── 8. SALE BOOK (50 Sale Invoices with Brokerage) ────────────
  console.log('📤 Seeding 50 Sale Book entries with Brokers & Brokerage...');
  const saleInvoices = [];
  for (let i = 1; i <= 50; i++) {
    const customer = randomChoice(customerParties);
    const broker = i % 2 === 0 ? randomChoice(brokerParties) : null;
    const brokeragePct = broker ? randomChoice([1.00, 1.50, 2.00]) : 0;
    const q = randomChoice(qualitiesList);
    const carats = randomFloat(2.0, 80.0, 3);
    const rate = randomInt(3000, 15000);
    const grossAmt = carats * rate;
    const brokerageAmount = broker ? parseFloat((grossAmt * (brokeragePct / 100)).toFixed(2)) : 0;
    const isInterstate = i % 2 === 0;
    const cgstAmt = isInterstate ? 0 : parseFloat((grossAmt * 0.0075).toFixed(2));
    const sgstAmt = isInterstate ? 0 : parseFloat((grossAmt * 0.0075).toFixed(2));
    const igstAmt = isInterstate ? parseFloat((grossAmt * 0.015).toFixed(2)) : 0;
    const tcsAmt = parseFloat((grossAmt * 0.001).toFixed(2)); // 0.1% TCS Section 206C(1H)
    const gstAmt = cgstAmt + sgstAmt + igstAmt;
    const netAmt = grossAmt + gstAmt + tcsAmt;
    const pStatus: PaymentStatus = i % 2 === 0 ? 'PAID' : (i % 3 === 0 ? 'PARTIAL' : 'UNPAID');
    const jamaAmt = pStatus === 'PAID' ? netAmt : (pStatus === 'PARTIAL' ? parseFloat((netAmt / 2).toFixed(2)) : 0);
    const outstanding = netAmt - jamaAmt;

    const sal = await prisma.saleInvoice.create({
      data: {
        companyId: company1.id,
        financialYearId: fy1.id,
        voucherNumber: `DST-2627-SAL-${String(i).padStart(6, '0')}`,
        billNumber: `DST-SAL-${String(i).padStart(4, '0')}`,
        invoiceDate: new Date(2026, randomInt(4, 6), randomInt(1, 28)),
        customerId: customer.id,
        brokerId: broker ? broker.id : null,
        brokeragePct,
        brokerageAmount,
        totalCarats: carats,
        totalPieces: randomInt(1, 10),
        totalGrossAmount: grossAmt,
        totalCgst: cgstAmt,
        totalSgst: sgstAmt,
        totalIgst: igstAmt,
        totalTcs: tcsAmt,
        tcsSection: '206C(1H)',
        tcsRate: 0.1,
        netAmount: netAmt,
        jamaAmount: jamaAmt,
        outstandingAmount: outstanding,
        paymentStatus: pStatus,
        status: 'SAVED',
        items: {
          create: [
            {
              rowNumber: 1,
              qualityId: q.id,
              hsnNumber: '71023920',
              carats,
              pieces: randomInt(1, 5),
              rate,
              grossAmount: grossAmt,
              cgstAmount: cgstAmt,
              sgstAmount: sgstAmt,
              igstAmount: igstAmt,
              netAmount: grossAmt + gstAmt,
              stockPacketId: stockPackets[i - 1]?.id || null,
            },
          ],
        },
      },
    });
    saleInvoices.push(sal);
  }
  console.log('   ✅ 50 Sale Book entries created (with Brokers & Brokerage)');

  // ─── 8b. CREDIT NOTES (Sales Returns & Purchase Debit Notes) ────
  console.log('📜 Seeding Credit Notes (Sales Returns)...');
  for (let i = 1; i <= 10; i++) {
    const refSale = saleInvoices[i - 1];
    const carats = randomFloat(1.0, 10.0, 3);
    const rate = randomInt(3000, 10000);
    const grossAmt = carats * rate;
    const netAmt = grossAmt + (grossAmt * 0.0025);

    await prisma.saleInvoice.create({
      data: {
        companyId: company1.id,
        financialYearId: fy1.id,
        invoiceType: 'SALE_RETURN',
        voucherNumber: `DST-2627-CN-${String(i).padStart(6, '0')}`,
        billNumber: `DST-CN-${String(i).padStart(4, '0')}`,
        invoiceDate: new Date(2026, 5, randomInt(1, 28)),
        customerId: refSale.customerId,
        referenceInvoiceId: refSale.id,
        referenceBillNumber: refSale.billNumber,
        totalCarats: carats,
        totalPieces: 1,
        totalGrossAmount: grossAmt,
        netAmount: netAmt,
        jamaAmount: netAmt,
        outstandingAmount: 0,
        paymentStatus: 'PAID',
        status: 'SAVED',
        narration: `Credit Note / Sales Return against ${refSale.billNumber}`,
        items: {
          create: [
            {
              rowNumber: 1,
              qualityId: qualitiesList[0].id,
              hsnNumber: '71023920',
              carats,
              pieces: 1,
              rate,
              grossAmount: grossAmt,
              netAmount: grossAmt,
            },
          ],
        },
      },
    });
  }
  console.log('   ✅ 10 Credit Notes created');

  // ─── 8c. DEBIT NOTES (Purchase Returns)... ─────
  console.log('📜 Seeding Debit Notes (Purchase Returns)...');
  for (let i = 1; i <= 10; i++) {
    const refPur = purchaseInvoices[i - 1];
    const carats = randomFloat(1.0, 15.0, 3);
    const rate = randomInt(2000, 8000);
    const grossAmt = carats * rate;
    const netAmt = grossAmt + (grossAmt * 0.0025);

    await prisma.purchaseInvoice.create({
      data: {
        companyId: company1.id,
        financialYearId: fy1.id,
        invoiceType: 'PURCHASE_RETURN',
        voucherNumber: `DST-2627-DN-${String(i).padStart(6, '0')}`,
        billNumber: `DST-DN-${String(i).padStart(4, '0')}`,
        invoiceDate: new Date(2026, 5, randomInt(1, 28)),
        supplierId: refPur.supplierId,
        referenceInvoiceId: refPur.id,
        referenceBillNumber: refPur.billNumber,
        totalCarats: carats,
        totalPieces: 1,
        totalGrossAmount: grossAmt,
        netAmount: netAmt,
        jamaAmount: netAmt,
        outstandingAmount: 0,
        paymentStatus: 'PAID',
        status: 'SAVED',
        narration: `Debit Note / Purchase Return against ${refPur.billNumber}`,
        items: {
          create: [
            {
              rowNumber: 1,
              qualityId: qualitiesList[0].id,
              hsnNumber: '71023920',
              carats,
              pieces: 1,
              rate,
              grossAmount: grossAmt,
              netAmount: grossAmt,
            },
          ],
        },
      },
    });
  }
  console.log('   ✅ 10 Debit Notes created');

  // ─── 8d. SALE DEBIT NOTES ───────────────────────────────────────
  console.log('📜 Seeding Sale Debit Notes...');
  for (let i = 1; i <= 10; i++) {
    const refSale = saleInvoices[i + 10];
    const carats = randomFloat(0.5, 5.0, 3);
    const rate = randomInt(2000, 5000);
    const grossAmt = carats * rate;
    const netAmt = grossAmt + (grossAmt * 0.0025);

    await prisma.saleInvoice.create({
      data: {
        companyId: company1.id,
        financialYearId: fy1.id,
        invoiceType: 'SALE_DEBIT_NOTE',
        voucherNumber: `DST-2627-SDN-${String(i).padStart(6, '0')}`,
        billNumber: `DST-SDN-${String(i).padStart(4, '0')}`,
        invoiceDate: new Date(2026, 5, randomInt(1, 28)),
        customerId: refSale.customerId,
        referenceInvoiceId: refSale.id,
        referenceBillNumber: refSale.billNumber,
        totalCarats: carats,
        totalPieces: 1,
        totalGrossAmount: grossAmt,
        netAmount: netAmt,
        jamaAmount: 0,
        outstandingAmount: netAmt,
        paymentStatus: 'UNPAID',
        status: 'SAVED',
        narration: `Sale Debit Note (Price adjustment / Rate difference) against ${refSale.billNumber}`,
        items: {
          create: [
            {
              rowNumber: 1,
              qualityId: qualitiesList[1].id,
              hsnNumber: '71023920',
              carats,
              pieces: 1,
              rate,
              grossAmount: grossAmt,
              netAmount: grossAmt,
            },
          ],
        },
      },
    });
  }
  console.log('   ✅ 10 Sale Debit Notes created');

  // ─── 8e. PURCHASE CREDIT NOTES ─────────────────────────────────
  console.log('📜 Seeding Purchase Credit Notes...');
  for (let i = 1; i <= 10; i++) {
    const refPur = purchaseInvoices[i + 10];
    const carats = randomFloat(0.5, 8.0, 3);
    const rate = randomInt(1500, 6000);
    const grossAmt = carats * rate;
    const netAmt = grossAmt + (grossAmt * 0.0025);

    await prisma.purchaseInvoice.create({
      data: {
        companyId: company1.id,
        financialYearId: fy1.id,
        invoiceType: 'PURCHASE_DEBIT_NOTE',
        voucherNumber: `DST-2627-PCN-${String(i).padStart(6, '0')}`,
        billNumber: `DST-PCN-${String(i).padStart(4, '0')}`,
        invoiceDate: new Date(2026, 5, randomInt(1, 28)),
        supplierId: refPur.supplierId,
        referenceInvoiceId: refPur.id,
        referenceBillNumber: refPur.billNumber,
        totalCarats: carats,
        totalPieces: 1,
        totalGrossAmount: grossAmt,
        netAmount: netAmt,
        jamaAmount: netAmt,
        outstandingAmount: 0,
        paymentStatus: 'PAID',
        status: 'SAVED',
        narration: `Purchase Credit Note (Vendor discount / Allowance) against ${refPur.billNumber}`,
        items: {
          create: [
            {
              rowNumber: 1,
              qualityId: qualitiesList[1].id,
              hsnNumber: '71023920',
              carats,
              pieces: 1,
              rate,
              grossAmount: grossAmt,
              netAmount: grossAmt,
            },
          ],
        },
      },
    });
  }
  console.log('   ✅ 10 Purchase Credit Notes created');

  // ─── 9. CHALLAN BOOK (50 Challan Vouchers) ─────────────────────
  console.log('📄 Seeding 50 Challan Book entries...');
  const purposes: ChallanPurpose[] = ['TRADING_JHANGHAD', 'JOB_WORK', 'SALE_ORDER', 'PURCHASE_ORDER', 'INTERNAL_TRANSFER', 'CERTIFICATION'];
  const challanStatuses: ChallanStatus[] = ['ISSUED', 'RETURNED', 'CONVERTED', 'DRAFT', 'PARTIAL_RETURN'];

  for (let i = 1; i <= 50; i++) {
    const purpose = randomChoice(purposes);
    const status = randomChoice(challanStatuses);
    const party = purpose === 'JOB_WORK' ? randomChoice(workerParties) : randomChoice(customerParties);
    const q = randomChoice(qualitiesList);
    const carats = randomFloat(5.0, 150.0, 3);
    const rate = randomInt(500, 5000);
    const totalAmt = carats * rate;
    const pkt = stockPackets[i - 1];

    let prefix = 'CH';
    if (purpose === 'JOB_WORK') prefix = 'CH-JW';
    else if (purpose === 'TRADING_JHANGHAD') prefix = 'DST-2627-CHL-JH';

    await prisma.challanVoucher.create({
      data: {
        companyId: company1.id,
        financialYearId: fy1.id,
        purpose,
        voucherNumber: `${prefix}-${String(i).padStart(6, '0')}`,
        challanNumber: `${prefix}-${String(i).padStart(6, '0')}`,
        challanDate: new Date(2026, randomInt(3, 6), randomInt(1, 28)),
        status,
        partyId: party.id,
        partyName: party.accountName,
        totalCarats: carats,
        totalPieces: randomInt(1, 5),
        totalAmount: totalAmt,
        returnedCarats: status === 'RETURNED' || status === 'CONVERTED' ? carats : 0,
        returnedPieces: status === 'RETURNED' || status === 'CONVERTED' ? 1 : 0,
        items: {
          create: [
            {
              rowNumber: 1,
              qualityId: q.id,
              carats,
              pieces: 1,
              rate,
              amount: totalAmt,
              returnedCarats: status === 'RETURNED' || status === 'CONVERTED' ? carats : 0,
              returnedPieces: status === 'RETURNED' || status === 'CONVERTED' ? 1 : 0,
              stockPacketId: pkt.id,
            },
          ],
        },
      },
    });
  }
  console.log('   ✅ 50 Challan Book entries created');

  // ─── 9b. JOB VOUCHERS (10 Job Expense & 10 Job Income) ────────
  console.log('⚒️ Seeding Job Vouchers (Job Expense & Job Income)...');
  for (let i = 1; i <= 10; i++) {
    const worker = randomChoice(workerParties);
    const q = randomChoice(qualitiesList);
    const carats = randomFloat(10.0, 100.0, 3);
    const pcs = randomInt(5, 50);
    const rate = randomInt(150, 600); // Labour charges per carat
    const totalAmt = carats * rate;

    // Job Expense (Processing charges paid to worker)
    await prisma.jobVoucher.create({
      data: {
        companyId: company1.id,
        financialYearId: fy1.id,
        jobType: 'JOB_EXPENSE',
        voucherNumber: `DST-2627-JEXP-${String(i).padStart(6, '0')}`,
        billNumber: `WORK-BILL-${worker.id}-${String(i).padStart(4, '0')}`,
        voucherDate: new Date(2026, 4, randomInt(1, 28)),
        status: 'POSTED',
        partyId: worker.id,
        totalCarats: carats,
        totalAmount: totalAmt,
        narration: `Job Work Processing Charges for Polishing ${carats} ct`,
        items: {
          create: [
            {
              rowNumber: 1,
              qualityId: q.id,
              carats,
              pieces: pcs,
              rate,
              amount: totalAmt,
              remarks: 'Polishing & laser cutting charge',
            },
          ],
        },
      },
    });

    // Job Income (Processing charges billed to client)
    const client = randomChoice(customerParties);
    const incCarats = randomFloat(8.0, 80.0, 3);
    const incRate = randomInt(250, 800);
    const incTotalAmt = incCarats * incRate;

    await prisma.jobVoucher.create({
      data: {
        companyId: company1.id,
        financialYearId: fy1.id,
        jobType: 'JOB_INCOME',
        voucherNumber: `DST-2627-JINC-${String(i).padStart(6, '0')}`,
        billNumber: `JOB-INC-${client.id}-${String(i).padStart(4, '0')}`,
        voucherDate: new Date(2026, 5, randomInt(1, 28)),
        status: 'POSTED',
        partyId: client.id,
        totalCarats: incCarats,
        totalAmount: incTotalAmt,
        narration: `Custom Diamond Processing Income from client ${client.accountName}`,
        items: {
          create: [
            {
              rowNumber: 1,
              qualityId: q.id,
              carats: incCarats,
              pieces: randomInt(2, 30),
              rate: incRate,
              amount: incTotalAmt,
              remarks: 'Specialized table polishing income',
            },
          ],
        },
      },
    });
  }
  console.log('   ✅ 10 Job Expense & 10 Job Income Vouchers created');

  // ─── 10. STOCK CONVERSIONS (50 Stock Conversions) ──────────────
  console.log('🔄 Seeding 50 Stock Conversion entries...');
  for (let i = 1; i <= 50; i++) {
    const srcPkt = stockPackets[i - 1];
    const srcCarats = Number(srcPkt.caratWeight);
    const srcCost = Number(srcPkt.totalCost);
    const outputCarats = parseFloat((srcCarats * randomFloat(0.70, 0.90, 2)).toFixed(3));
    const lossCarats = parseFloat((srcCarats - outputCarats).toFixed(3));
    const lossPct = parseFloat(((lossCarats / srcCarats) * 100).toFixed(2));
    const outputQ = randomChoice(qualitiesList);

    const processingCost = randomInt(500, 2000);
    const totalInputInvestment = srcCost + processingCost;
    const allocatedCostPerCarat = parseFloat((totalInputInvestment / (outputCarats || 1)).toFixed(2));
    const targetAskingRate = randomInt(4000, 12000);
    const targetValuation = outputCarats * targetAskingRate;
    const targetPkt = stockPackets[(i % 40) + 5];

    // Update target output packet with proper allocated cost and target asking rate
    await prisma.stockPacket.update({
      where: { id: targetPkt.id },
      data: {
        sourcePacketId: srcPkt.id,
        costPerCarat: allocatedCostPerCarat,
        totalCost: totalInputInvestment,
        targetSaleRate: targetAskingRate,
      },
    });

    await prisma.stockConversion.create({
      data: {
        companyId: company1.id,
        conversionDate: new Date(2026, randomInt(4, 6), randomInt(1, 28)),
        conversionNumber: `DST-CONV-${String(i).padStart(6, '0')}`,
        sourcePacketId: srcPkt.id,
        sourceQualityId: srcPkt.qualityId,
        sourceCarats: srcCarats,
        sourceCost: srcCost,
        isFullConsumption: true,
        consumedCarats: srcCarats,
        remainingCarats: 0,
        processingCost,
        totalOutputCarats: outputCarats,
        weightLoss: lossCarats,
        lossPercentage: lossPct,
        narration: `Rough to Polished Quality Transformation #${i}`,
        outputItems: {
          create: [
            {
              rowNumber: 1,
              outputPacketId: targetPkt.id,
              outputQualityId: outputQ.id,
              carats: outputCarats,
              pieces: 1,
              shape: randomChoice(SHAPES),
              color: randomChoice(COLORS),
              costPerCarat: allocatedCostPerCarat,
              totalCost: totalInputInvestment,
              targetSaleRate: targetAskingRate,
            },
          ],
        },
      },
    });
  }
  console.log('   ✅ 50 Stock Conversion entries created');

  // ─── 11. CASH & BANK BOOK (50 Cash/Bank Vouchers) ──────────────
  console.log('🏦 Seeding 50 Cash & Bank Book entries...');
  const txTypes: CashBankType[] = ['CASH_RECEIPT', 'CASH_PAYMENT', 'BANK_RECEIPT', 'BANK_PAYMENT'];
  const modes: PaymentMode[] = ['CASH', 'CHEQUE', 'NEFT', 'RTGS', 'IMPS'];

  for (let i = 1; i <= 50; i++) {
    const type = randomChoice(txTypes);
    const mode = type.startsWith('CASH') ? 'CASH' : randomChoice(modes.filter(m => m !== 'CASH'));
    const isReceipt = type.endsWith('RECEIPT');
    const party = isReceipt ? randomChoice(customerParties) : randomChoice(supplierParties);
    const bankOrCashAcc = type.startsWith('CASH') ? accCash : (i % 2 === 0 ? accHdfc : accIcici);
    const amt = randomInt(10000, 500000);

    let prefix = 'CR';
    if (type === 'CASH_PAYMENT') prefix = 'CP';
    else if (type === 'BANK_RECEIPT') prefix = 'BR';
    else if (type === 'BANK_PAYMENT') prefix = 'BP';

    await prisma.cashBankVoucher.create({
      data: {
        companyId: company1.id,
        financialYearId: fy1.id,
        transactionType: type,
        voucherNumber: `DST-2627-${prefix}-${String(i).padStart(6, '0')}`,
        voucherDate: new Date(2026, randomInt(4, 6), randomInt(1, 28)),
        partyId: party.id,
        cashBankAccountId: bankOrCashAcc.id,
        amount: amt,
        paymentMode: mode,
        chequeNumber: mode !== 'CASH' ? `TXN${randomInt(10000000, 99999999)}` : null,
        referenceBillNo: isReceipt ? saleInvoices[i - 1]?.billNumber : purchaseInvoices[i - 1]?.billNumber,
        narration: `Payment transaction #${i} via ${mode}`,
      },
    });
  }
  console.log('   ✅ 50 Cash & Bank entries created');

  // ─── 12. GENERAL LEDGER POSTINGS (50 GL Entries) ────────────────
  console.log('📊 Seeding 50 General Ledger Postings...');
  const glEntries = [];
  for (let i = 1; i <= 50; i++) {
    const isSale = i % 2 === 0;
    const acc = isSale ? randomChoice(customerParties) : randomChoice(supplierParties);
    const contraAcc = isSale ? accSales : accPurchase;
    const amt = randomInt(50000, 800000);
    const date = new Date(2026, randomInt(4, 6), randomInt(1, 28));

    glEntries.push({
      companyId: company1.id,
      accountId: acc.id,
      voucherDate: date,
      debitCreditType: isSale ? 'DEBIT' : 'CREDIT',
      amount: amt,
      sourceVoucherType: isSale ? 'SALE_INVOICE' : 'PURCHASE_INVOICE',
      sourceVoucherId: i,
      sourceBillNumber: isSale ? `DST-SAL-${String(i).padStart(4, '0')}` : `BILL-SUP-${String(i).padStart(4, '0')}`,
      narration: `Automated GL Posting #${i}`,
    });

    glEntries.push({
      companyId: company1.id,
      accountId: contraAcc.id,
      voucherDate: date,
      debitCreditType: isSale ? 'CREDIT' : 'DEBIT',
      amount: amt,
      sourceVoucherType: isSale ? 'SALE_INVOICE' : 'PURCHASE_INVOICE',
      sourceVoucherId: i,
      sourceBillNumber: isSale ? `DST-SAL-${String(i).padStart(4, '0')}` : `BILL-SUP-${String(i).padStart(4, '0')}`,
      narration: `Automated GL Contra Posting #${i}`,
    });
  }

  await prisma.generalLedgerEntry.createMany({ data: glEntries });
  console.log('   ✅ 50 General Ledger Postings created');

  console.log('\n✨ Database seeding completed successfully! Master pages remain clean (~5 entries), while all operational pages now contain 50 rich, varied demo entries!');
}

cleanAndSeed()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
