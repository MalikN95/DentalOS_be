import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { MonthsQueryDto } from './dto/months-query.dto';
import { StatsAdminService } from './stats-admin.service';

@ApiTags('platform-admin')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('platform/stats')
export class StatsAdminController {
  constructor(private readonly statsAdminService: StatsAdminService) {}

  @Get('overview')
  getOverview() {
    return this.statsAdminService.getOverview();
  }

  @Get('revenue-by-month')
  getRevenueByMonth(@Query() query: MonthsQueryDto) {
    return this.statsAdminService.getRevenueByMonth(query.months);
  }

  @Get('clinics-growth')
  getClinicsGrowth(@Query() query: MonthsQueryDto) {
    return this.statsAdminService.getClinicsGrowth(query.months);
  }
}
