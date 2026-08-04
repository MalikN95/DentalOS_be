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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicsAdminService } from './clinics-admin.service';
import { CreateClinicAdminDto } from './dto/create-clinic-admin.dto';
import { ListClinicsAdminQueryDto } from './dto/list-clinics-admin-query.dto';
import { UpdateClinicAdminDto } from './dto/update-clinic-admin.dto';

@ApiTags('platform-admin')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('platform/clinics')
export class ClinicsAdminController {
  constructor(private readonly clinicsAdminService: ClinicsAdminService) {}

  @Get()
  list(@Query() query: ListClinicsAdminQueryDto) {
    return this.clinicsAdminService.list(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinicsAdminService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateClinicAdminDto) {
    return this.clinicsAdminService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateClinicAdminDto) {
    return this.clinicsAdminService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.clinicsAdminService.remove(id);
  }
}
