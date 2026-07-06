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
import { ServiceCategoryEntity } from '../../entities/service-category.entity';
import { CreateServiceCategoryDto } from './dto/create-service-category.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UpdateServiceCategoryDto } from './dto/update-service-category.dto';
import { ServiceCategoriesService } from './service-categories.service';
import { PaginatedResult } from './types/paginated-result.type';

@ApiTags('service-categories')
@ApiBearerAuth()
@Controller('service-categories')
export class ServiceCategoriesController {
  constructor(
    private readonly serviceCategoriesService: ServiceCategoriesService,
  ) {}

  @Get()
  findAll(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<ServiceCategoryEntity>> {
    return this.serviceCategoriesService.findAll(clinic.id, query);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreateServiceCategoryDto,
  ): Promise<ServiceCategoryEntity> {
    return this.serviceCategoriesService.create(clinic.id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServiceCategoryDto,
  ): Promise<ServiceCategoryEntity> {
    return this.serviceCategoriesService.update(clinic.id, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.serviceCategoriesService.remove(clinic.id, id);
  }
}
