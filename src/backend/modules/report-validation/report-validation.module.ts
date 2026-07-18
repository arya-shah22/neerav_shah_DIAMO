import { Module } from '@nestjs/common';
import { ReportValidationService } from './report-validation.service';
import { ReportValidationController } from './report-validation.controller';
import { ReportModule } from '../report/report.module';

@Module({
  imports: [ReportModule],
  providers: [ReportValidationService],
  controllers: [ReportValidationController],
  exports: [ReportValidationService]
})
export class ReportValidationModule {}
