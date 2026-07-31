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
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import type { JwtPayload } from '../../common/types/jwt-payload.type';
import { ClinicEntity } from '../../entities/clinic.entity';
import { TreatmentPlanItemEntity } from '../../entities/treatment-plan-item.entity';
import { TreatmentPlanEntity } from '../../entities/treatment-plan.entity';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { ListTreatmentPlansQueryDto } from './dto/list-treatment-plans-query.dto';
import { ReplaceTreatmentPlanItemsDto } from './dto/replace-treatment-plan-items.dto';
import { UpdateTreatmentPlanItemDto } from './dto/update-treatment-plan-item.dto';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';
import { TreatmentPlansService } from './treatment-plans.service';
import { PaginatedResult } from './types/paginated-result.type';

@ApiTags('treatment-plans')
@ApiBearerAuth()
@Controller('treatment-plans')
export class TreatmentPlansController {
  constructor(private readonly treatmentPlansService: TreatmentPlansService) {}

  @Get()
  @ApiOperation({ summary: 'List treatment plans of a patient' })
  list(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser() user: JwtPayload,
    @Query() query: ListTreatmentPlansQueryDto,
  ): Promise<PaginatedResult<TreatmentPlanEntity>> {
    return this.treatmentPlansService.list(clinic.id, query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a treatment plan by id' })
  findOne(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TreatmentPlanEntity> {
    return this.treatmentPlansService.findOne(clinic.id, id, user);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Create a treatment plan with items' })
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateTreatmentPlanDto,
  ): Promise<TreatmentPlanEntity> {
    return this.treatmentPlansService.create(clinic.id, user, dto);
  }

  @Patch('items/:itemId')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Update treatment plan item status' })
  updateItem(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateTreatmentPlanItemDto,
  ): Promise<TreatmentPlanItemEntity> {
    return this.treatmentPlansService.updateItem(clinic.id, itemId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Update treatment plan title, notes or status' })
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTreatmentPlanDto,
  ): Promise<TreatmentPlanEntity> {
    return this.treatmentPlansService.update(clinic.id, id, dto);
  }

  @Put(':id/items')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: 'Replace all items of a treatment plan' })
  replaceItems(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceTreatmentPlanItemsDto,
  ): Promise<TreatmentPlanEntity> {
    return this.treatmentPlansService.replaceItems(clinic.id, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.DOCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a treatment plan' })
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.treatmentPlansService.remove(clinic.id, id);
  }
}
