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
import { ClinicEntity } from '../../entities/clinic.entity';
import {
  DoctorProfileResponse,
  DoctorsService,
  PaginatedDoctors,
} from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';
import { PhotoUploadDto, PhotoUploadResponseDto } from './dto/photo-upload.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

@ApiTags('doctors')
@ApiBearerAuth()
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  findAll(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListDoctorsQueryDto,
  ): Promise<PaginatedDoctors> {
    return this.doctorsService.findAll(clinic.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<DoctorProfileResponse> {
    return this.doctorsService.findOne(clinic.id, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreateDoctorDto,
  ): Promise<DoctorProfileResponse> {
    return this.doctorsService.create(clinic.id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDoctorDto,
  ): Promise<DoctorProfileResponse> {
    return this.doctorsService.update(clinic.id, id, dto);
  }

  @Post(':id/photo-upload')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: PhotoUploadResponseDto })
  createPhotoUpload(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PhotoUploadDto,
  ): Promise<PhotoUploadResponseDto> {
    return this.doctorsService.createPhotoUpload(
      clinic.id,
      id,
      dto.contentType,
    );
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.doctorsService.remove(clinic.id, id);
  }
}
