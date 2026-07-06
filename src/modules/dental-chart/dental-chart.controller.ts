import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { ClinicEntity } from '../../entities/clinic.entity';
import { ToothMarkEntity } from '../../entities/tooth-mark.entity';
import { DentalChartService } from './dental-chart.service';
import { CreateToothMarkDto } from './dto/create-tooth-mark.dto';
import { ToothHistoryQueryDto } from './dto/tooth-history-query.dto';
import { ToothStateDto } from './dto/tooth-state.dto';
import { PaginatedResult } from './types/paginated-result.type';

@ApiTags('dental-chart')
@ApiBearerAuth()
@Controller('dental-chart')
export class DentalChartController {
  constructor(private readonly dentalChartService: DentalChartService) {}

  @Get(':patientId')
  @ApiOperation({
    summary: 'Current dental chart: latest mark per tooth',
  })
  @ApiOkResponse({ type: [ToothStateDto] })
  getChart(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('patientId', ParseUUIDPipe) patientId: string,
  ): Promise<ToothStateDto[]> {
    return this.dentalChartService.getChart(clinic.id, patientId);
  }

  @Get(':patientId/history')
  @ApiOperation({ summary: 'Full tooth mark history of a patient' })
  getHistory(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: ToothHistoryQueryDto,
  ): Promise<PaginatedResult<ToothMarkEntity>> {
    return this.dentalChartService.getHistory(clinic.id, patientId, query);
  }

  @Post(':patientId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Add a tooth mark' })
  addMark(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateToothMarkDto,
  ): Promise<ToothMarkEntity> {
    return this.dentalChartService.addMark(clinic.id, patientId, user, dto);
  }

  @Delete('marks/:markId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a tooth mark' })
  removeMark(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('markId', ParseUUIDPipe) markId: string,
  ): Promise<void> {
    return this.dentalChartService.removeMark(clinic.id, markId);
  }
}
