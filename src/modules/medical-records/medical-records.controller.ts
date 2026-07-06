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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { ClinicEntity } from '../../entities/clinic.entity';
import { MedicalRecordEntity } from '../../entities/medical-record.entity';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { ListMedicalRecordsQueryDto } from './dto/list-medical-records-query.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';
import { MedicalRecordsService } from './medical-records.service';
import { PaginatedResult } from './types/paginated-result.type';

@ApiTags('medical-records')
@ApiBearerAuth()
@Controller('medical-records')
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get()
  @ApiOperation({ summary: 'List medical records of a patient' })
  list(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListMedicalRecordsQueryDto,
  ): Promise<PaginatedResult<MedicalRecordEntity>> {
    return this.medicalRecordsService.list(clinic.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a medical record by id' })
  findOne(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MedicalRecordEntity> {
    return this.medicalRecordsService.findOne(clinic.id, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Create a medical record' })
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateMedicalRecordDto,
  ): Promise<MedicalRecordEntity> {
    return this.medicalRecordsService.create(clinic.id, user, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Update a medical record' })
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMedicalRecordDto,
  ): Promise<MedicalRecordEntity> {
    return this.medicalRecordsService.update(clinic.id, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a medical record' })
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.medicalRecordsService.remove(clinic.id, id);
  }
}
