// Quick diagnostic: Call dashboard telemetry for company 1 and print results
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/backend/app.module';
import { DashboardService } from '../src/backend/modules/dashboard/dashboard.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  const svc = app.get(DashboardService);

  console.log('=== Calling getDashboardTelemetry(companyId=1) ===');
  const result = await svc.getDashboardTelemetry(1);

  console.log('\n--- HEADER ---');
  console.log(JSON.stringify(result.header, null, 2));

  console.log('\n--- RECEIVABLES (INR) ---');
  console.log(JSON.stringify(result.receivablesInr, null, 2));

  console.log('\n--- RECEIVABLES (USD) ---');
  console.log(JSON.stringify(result.receivablesUsd, null, 2));

  console.log('\n--- PAYABLES (INR) ---');
  console.log(JSON.stringify(result.payablesInr, null, 2));

  console.log('\n--- PAYABLES (USD) ---');
  console.log(JSON.stringify(result.payablesUsd, null, 2));

  console.log('\n--- STOCK ---');
  console.log(JSON.stringify(result.stock, null, 2));

  console.log('\n--- CASH (Today) ---');
  console.log(JSON.stringify(result.todayCash, null, 2));

  console.log('\n--- BANK ---');
  console.log(JSON.stringify(result.todayBank, null, 2));

  console.log('\n--- TODAY SALES ---');
  console.log(JSON.stringify(result.todaySales, null, 2));

  console.log('\n--- BUSINESS SUMMARY ---');
  console.log(JSON.stringify(result.businessSummary, null, 2));

  await app.close();
}

main().catch(console.error);
