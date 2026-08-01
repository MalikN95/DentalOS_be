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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { ClinicEntity } from '../../entities/clinic.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ListStaffQueryDto } from './dto/list-staff-query.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { StaffService } from './staff.service';
import { PaginatedResult, StaffMember } from './staff.types';

const WRITE_ROLES = [UserRole.OWNER, UserRole.ADMIN] as const;

@ApiTags('staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @ApiOkResponse({ description: 'Paginated clinic employees' })
  findAll(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListStaffQueryDto,
  ): Promise<PaginatedResult<StaffMember>> {
    return this.staffService.findAll(clinic.id, query);
  }

  @Get('catalog/specializations')
  @ApiOkResponse({ type: [String] })
  listSpecializationsCatalog(
    @CurrentClinic() clinic: ClinicEntity,
  ): Promise<string[]> {
    return this.staffService.listSpecializationsCatalog(clinic.id);
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Employee with the doctor profile when present',
  })
  findOne(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StaffMember> {
    return this.staffService.findOne(clinic.id, id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiCreatedResponse({ description: 'Created employee' })
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreateStaffDto,
  ): Promise<StaffMember> {
    return this.staffService.create(clinic.id, dto);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOkResponse({ description: 'Updated employee' })
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffDto,
  ): Promise<StaffMember> {
    return this.staffService.update(clinic.id, id, dto);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser() currentUser: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.staffService.remove(clinic.id, id, currentUser.sub);
  }
}
