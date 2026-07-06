import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { AnalyticsService } from './analytics.service';
import { PeriodQueryDto } from './dto/period-query.dto';
import {
  CancellationsAnalytics,
  ConversionAnalytics,
  DoctorLoadItem,
  RepeatVisitsAnalytics,
  RevenueAnalytics,
  TopServiceItem,
} from './types/analytics-results.type';

@ApiTags('analytics')
@ApiBearerAuth()
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('revenue')
  getRevenue(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: PeriodQueryDto,
  ): Promise<RevenueAnalytics> {
    return this.analyticsService.getRevenue(clinic.id, query);
  }

  @Get('doctors-load')
  getDoctorsLoad(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: PeriodQueryDto,
  ): Promise<DoctorLoadItem[]> {
    return this.analyticsService.getDoctorsLoad(clinic.id, query);
  }

  @Get('repeat-visits')
  getRepeatVisits(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: PeriodQueryDto,
  ): Promise<RepeatVisitsAnalytics> {
    return this.analyticsService.getRepeatVisits(clinic.id, query);
  }

  @Get('conversion')
  getConversion(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: PeriodQueryDto,
  ): Promise<ConversionAnalytics> {
    return this.analyticsService.getConversion(clinic.id, query);
  }

  @Get('top-services')
  getTopServices(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: PeriodQueryDto,
  ): Promise<TopServiceItem[]> {
    return this.analyticsService.getTopServices(clinic.id, query);
  }

  @Get('cancellations')
  getCancellations(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: PeriodQueryDto,
  ): Promise<CancellationsAnalytics> {
    return this.analyticsService.getCancellations(clinic.id, query);
  }
}
