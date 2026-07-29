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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { PatientTagEntity } from '../../entities/patient-tag.entity';
import { CreatePatientTagDto } from './dto/create-patient-tag.dto';
import { UpdatePatientTagDto } from './dto/update-patient-tag.dto';
import { PatientTagsService } from './patient-tags.service';

const WRITE_ROLES = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.RECEPTIONIST,
] as const;

@ApiTags('patient-tags')
@ApiBearerAuth()
@Controller('patient-tags')
export class PatientTagsController {
  constructor(private readonly patientTagsService: PatientTagsService) {}

  @Get()
  list(@CurrentClinic() clinic: ClinicEntity): Promise<PatientTagEntity[]> {
    return this.patientTagsService.list(clinic.id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreatePatientTagDto,
  ): Promise<PatientTagEntity> {
    return this.patientTagsService.create(clinic.id, dto);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientTagDto,
  ): Promise<PatientTagEntity> {
    return this.patientTagsService.update(clinic.id, id, dto);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.patientTagsService.remove(clinic.id, id);
  }
}
