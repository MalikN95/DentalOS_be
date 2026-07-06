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
import { ReferralEntity } from '../../entities/referral.entity';
import { CreateReferralDto } from './dto/create-referral.dto';
import { ListReferralsQueryDto } from './dto/list-referrals-query.dto';
import { UpdateReferralDto } from './dto/update-referral.dto';
import { ReferralsService } from './referrals.service';
import { PaginatedResult } from './types/paginated-result.type';

@ApiTags('marketing')
@ApiBearerAuth()
@Controller('marketing/referrals')
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Get()
  findAll(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListReferralsQueryDto,
  ): Promise<PaginatedResult<ReferralEntity>> {
    return this.referralsService.findAll(clinic.id, query);
  }

  @Get(':id')
  findOne(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ReferralEntity> {
    return this.referralsService.findOne(clinic.id, id);
  }

  @Post()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreateReferralDto,
  ): Promise<ReferralEntity> {
    return this.referralsService.create(clinic.id, dto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferralDto,
  ): Promise<ReferralEntity> {
    return this.referralsService.update(clinic.id, id, dto);
  }
}
