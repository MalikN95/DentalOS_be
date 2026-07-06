import {
  Body,
  Controller,
  Get,
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
import { GiftCertificateEntity } from '../../entities/gift-certificate.entity';
import { CreateGiftCertificateDto } from './dto/create-gift-certificate.dto';
import { ListGiftCertificatesQueryDto } from './dto/list-gift-certificates-query.dto';
import {
  GiftCertificatesService,
  PaginatedGiftCertificates,
} from './gift-certificates.service';

@ApiTags('gift-certificates')
@ApiBearerAuth()
@Controller('gift-certificates')
export class GiftCertificatesController {
  constructor(
    private readonly giftCertificatesService: GiftCertificatesService,
  ) {}

  @Get()
  list(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListGiftCertificatesQueryDto,
  ): Promise<PaginatedGiftCertificates> {
    return this.giftCertificatesService.list(clinic.id, query);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreateGiftCertificateDto,
  ): Promise<GiftCertificateEntity> {
    return this.giftCertificatesService.create(clinic.id, dto);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.ACCOUNTANT)
  cancel(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<GiftCertificateEntity> {
    return this.giftCertificatesService.cancel(clinic.id, id);
  }
}
