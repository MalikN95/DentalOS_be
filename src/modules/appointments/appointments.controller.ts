import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { UpdateAppointmentStatusDto } from './dto/update-appointment-status.dto';

const WRITE_ROLES = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.DOCTOR,
] as const;

@ApiTags('appointments')
@ApiBearerAuth()
@Roles(
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.DOCTOR,
  UserRole.RECEPTIONIST,
  UserRole.ASSISTANT,
  UserRole.ACCOUNTANT,
)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  @ApiOkResponse({ type: AppointmentEntity, isArray: true })
  findMany(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: QueryAppointmentsDto,
  ): Promise<AppointmentEntity[]> {
    return this.appointmentsService.findMany(clinic.id, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: AppointmentEntity })
  findOne(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AppointmentEntity> {
    return this.appointmentsService.findOne(clinic.id, id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiOkResponse({ type: AppointmentEntity })
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreateAppointmentDto,
  ): Promise<AppointmentEntity> {
    return this.appointmentsService.create(clinic.id, dto);
  }

  @Patch(':id/reschedule')
  @Roles(...WRITE_ROLES)
  @ApiOkResponse({ type: AppointmentEntity })
  reschedule(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
  ): Promise<AppointmentEntity> {
    return this.appointmentsService.reschedule(clinic.id, id, dto);
  }

  @Patch(':id/status')
  @Roles(...WRITE_ROLES)
  @ApiOkResponse({ type: AppointmentEntity })
  updateStatus(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentStatusDto,
  ): Promise<AppointmentEntity> {
    return this.appointmentsService.updateStatus(clinic.id, id, dto);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOkResponse({ type: AppointmentEntity })
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
  ): Promise<AppointmentEntity> {
    return this.appointmentsService.update(clinic.id, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.appointmentsService.remove(clinic.id, id);
  }
}
