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
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { PatientFileEntity } from '../../entities/patient-file.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { CreatePatientFileDto } from './dto/create-patient-file.dto';
import { CreatePatientDto } from './dto/create-patient.dto';
import { ListPatientFilesQueryDto } from './dto/list-patient-files-query.dto';
import { ListPatientsQueryDto } from './dto/list-patients-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import {
  FileUploadTargetDto,
  RequestFileUploadDto,
} from './dto/request-file-upload.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { PatientFilesService } from './patient-files.service';
import { PatientsService } from './patients.service';
import { PaginatedResult, PatientFileWithUrl } from './patients.types';

const WRITE_ROLES = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.DOCTOR,
  UserRole.RECEPTIONIST,
] as const;

@ApiTags('patients')
@ApiBearerAuth()
@Controller('patients')
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly patientFilesService: PatientFilesService,
  ) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated patients list' })
  findAll(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListPatientsQueryDto,
  ): Promise<PaginatedResult<PatientEntity>> {
    return this.patientsService.findAll(clinic.id, query);
  }

  @Get(':id/history')
  @ApiOkResponse({ description: 'Paginated visit history (appointments)' })
  getHistory(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<AppointmentEntity>> {
    return this.patientsService.getHistory(clinic.id, id, query);
  }

  @Get(':id/files')
  @ApiOkResponse({
    description: 'Paginated patient files with presigned download URLs',
  })
  findFiles(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListPatientFilesQueryDto,
  ): Promise<PaginatedResult<PatientFileWithUrl>> {
    return this.patientFilesService.findAll(clinic.id, id, query);
  }

  @Get(':id')
  @ApiOkResponse({ type: PatientEntity })
  findOne(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PatientEntity> {
    return this.patientsService.findOne(clinic.id, id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiCreatedResponse({ type: PatientEntity })
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreatePatientDto,
  ): Promise<PatientEntity> {
    return this.patientsService.create(clinic.id, dto);
  }

  @Post(':id/files/upload')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: FileUploadTargetDto })
  requestFileUpload(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RequestFileUploadDto,
  ): Promise<FileUploadTargetDto> {
    return this.patientFilesService.requestUpload(clinic.id, id, dto);
  }

  @Post(':id/files')
  @Roles(...WRITE_ROLES)
  @ApiCreatedResponse({ type: PatientFileEntity })
  confirmFileUpload(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePatientFileDto,
  ): Promise<PatientFileEntity> {
    return this.patientFilesService.confirmUpload(clinic.id, id, dto);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOkResponse({ type: PatientEntity })
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ): Promise<PatientEntity> {
    return this.patientsService.update(clinic.id, id, dto);
  }

  @Delete('files/:fileId')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeFile(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ): Promise<void> {
    return this.patientFilesService.remove(clinic.id, fileId);
  }

  @Post(':id/tags/:tagId')
  @Roles(...WRITE_ROLES)
  @ApiOkResponse({ type: PatientEntity })
  addTag(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ): Promise<PatientEntity> {
    return this.patientsService.addTag(clinic.id, id, tagId);
  }

  @Delete(':id/tags/:tagId')
  @Roles(...WRITE_ROLES)
  @ApiOkResponse({ type: PatientEntity })
  removeTag(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ): Promise<PatientEntity> {
    return this.patientsService.removeTag(clinic.id, id, tagId);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.patientsService.remove(clinic.id, id);
  }
}
