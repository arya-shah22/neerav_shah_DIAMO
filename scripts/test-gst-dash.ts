import { PrismaClient } from '@prisma/client';
import { GstReportService } from '../src/backend/modules/report/services/gst-report.service';

async function testGst() {
  const prisma = new PrismaClient();
  const service = new GstReportService();
  (service as any).prisma = prisma;

  const res = await service.getGstDashboard(1, '2026-04-01', '2026-08-06');
  console.log('GST Dashboard Response keys:', Object.keys(res));
  console.log('GST Dashboard Full Output:', JSON.stringify(res, null, 2));

  await prisma.$disconnect();
}

testGst().catch(console.error);
