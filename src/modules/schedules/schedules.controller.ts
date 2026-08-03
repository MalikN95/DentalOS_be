import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseArrayPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { ClinicEntity } from '../../entities/clinic.entity';
import { DoctorScheduleEntity } from '../../entities/doctor-schedule.entity';
import { ScheduleExceptionEntity } from '../../entities/schedule-exception.entity';
import { CreateScheduleExceptionDto } from './dto/create-schedule-exception.dto';
import { ListExceptionsQueryDto } from './dto/list-exceptions-query.dto';
import { ScheduleSlotDto } from './dto/schedule-slot.dto';
import { PaginatedExceptions, SchedulesService } from './schedules.service';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get('doctor/:doctorProfileId')
  getWeeklySchedule(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser() user: JwtPayload,
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
  ): Promise<DoctorScheduleEntity[]> {
    return this.schedulesService.getWeeklySchedule(
      clinic.id,
      doctorProfileId,
      user,
    );
  }

  @Put('doctor/:doctorProfileId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @ApiBody({ type: [ScheduleSlotDto] })
  @ApiOkResponse({ type: [DoctorScheduleEntity] })
  replaceWeeklySchedule(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
    @Body(new ParseArrayPipe({ items: ScheduleSlotDto, whitelist: true }))
    slots: ScheduleSlotDto[],
  ): Promise<DoctorScheduleEntity[]> {
    return this.schedulesService.replaceWeeklySchedule(
      clinic.id,
      doctorProfileId,
      slots,
    );
  }

  @Get('doctor/:doctorProfileId/exceptions')
  listExceptions(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser() user: JwtPayload,
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
    @Query() query: ListExceptionsQueryDto,
  ): Promise<PaginatedExceptions> {
    return this.schedulesService.listExceptions(
      clinic.id,
      doctorProfileId,
      query,
      user,
    );
  }

  @Post('doctor/:doctorProfileId/exceptions')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  createException(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser() user: JwtPayload,
    @Param('doctorProfileId', ParseUUIDPipe) doctorProfileId: string,
    @Body() dto: CreateScheduleExceptionDto,
  ): Promise<ScheduleExceptionEntity> {
    return this.schedulesService.createException(
      clinic.id,
      doctorProfileId,
      dto,
      user,
    );
  }

  @Delete('exceptions/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeException(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.schedulesService.removeException(clinic.id, id, user);
  }
}
