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
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { LeadEntity } from '../../entities/lead.entity';
import { CrmService } from './crm.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { ListLeadsQueryDto } from './dto/list-leads-query.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { FunnelResult, PaginatedResult } from './types/crm.types';

const STAFF_ROLES = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.RECEPTIONIST,
  UserRole.DOCTOR,
  UserRole.ASSISTANT,
  UserRole.ACCOUNTANT,
] as const;

@ApiTags('crm')
@ApiBearerAuth()
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Get('leads')
  @Roles(...STAFF_ROLES)
  findAll(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListLeadsQueryDto,
  ): Promise<PaginatedResult<LeadEntity>> {
    return this.crmService.findAll(clinic.id, query);
  }

  @Get('funnel')
  @Roles(...STAFF_ROLES)
  getFunnel(@CurrentClinic() clinic: ClinicEntity): Promise<FunnelResult> {
    return this.crmService.getFunnel(clinic.id);
  }

  @Post('leads')
  @Roles(...STAFF_ROLES)
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreateLeadDto,
  ): Promise<LeadEntity> {
    return this.crmService.create(clinic.id, dto);
  }

  @Patch('leads/:id')
  @Roles(...STAFF_ROLES)
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ): Promise<LeadEntity> {
    return this.crmService.update(clinic.id, id, dto);
  }

  @Delete('leads/:id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.crmService.remove(clinic.id, id);
  }
}
