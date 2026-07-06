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
import { CabinetEntity } from '../../entities/cabinet.entity';
import { ClinicEntity } from '../../entities/clinic.entity';
import { CabinetsService, PaginatedCabinets } from './cabinets.service';
import { CreateCabinetDto } from './dto/create-cabinet.dto';
import { ListCabinetsQueryDto } from './dto/list-cabinets-query.dto';
import { UpdateCabinetDto } from './dto/update-cabinet.dto';

@ApiTags('cabinets')
@ApiBearerAuth()
@Controller('cabinets')
export class CabinetsController {
  constructor(private readonly cabinetsService: CabinetsService) {}

  @Get()
  list(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListCabinetsQueryDto,
  ): Promise<PaginatedCabinets> {
    return this.cabinetsService.list(clinic.id, query);
  }

  @Get(':id')
  getById(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CabinetEntity> {
    return this.cabinetsService.getById(clinic.id, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreateCabinetDto,
  ): Promise<CabinetEntity> {
    return this.cabinetsService.create(clinic.id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCabinetDto,
  ): Promise<CabinetEntity> {
    return this.cabinetsService.update(clinic.id, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.cabinetsService.remove(clinic.id, id);
  }
}
