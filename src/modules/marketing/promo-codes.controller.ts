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
import { PromoCodeEntity } from '../../entities/promo-code.entity';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { ListPromoCodesQueryDto } from './dto/list-promo-codes-query.dto';
import { UpdatePromoCodeDto } from './dto/update-promo-code.dto';
import { ValidatePromoCodeDto } from './dto/validate-promo-code.dto';
import { PromoCodesService } from './promo-codes.service';
import { PaginatedResult } from './types/paginated-result.type';
import { PromoCodeValidationResult } from './types/promo-code-validation-result.type';

@ApiTags('marketing')
@ApiBearerAuth()
@Controller('marketing/promo-codes')
export class PromoCodesController {
  constructor(private readonly promoCodesService: PromoCodesService) {}

  @Get()
  findAll(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListPromoCodesQueryDto,
  ): Promise<PaginatedResult<PromoCodeEntity>> {
    return this.promoCodesService.findAll(clinic.id, query);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validate(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: ValidatePromoCodeDto,
  ): Promise<PromoCodeValidationResult> {
    return this.promoCodesService.validate(clinic.id, dto.code);
  }

  @Get(':id')
  findOne(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PromoCodeEntity> {
    return this.promoCodesService.findOne(clinic.id, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreatePromoCodeDto,
  ): Promise<PromoCodeEntity> {
    return this.promoCodesService.create(clinic.id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromoCodeDto,
  ): Promise<PromoCodeEntity> {
    return this.promoCodesService.update(clinic.id, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.promoCodesService.remove(clinic.id, id);
  }
}
