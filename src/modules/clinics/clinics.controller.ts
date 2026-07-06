import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { ClinicResponse, ClinicsService } from './clinics.service';
import { LogoUploadResponseDto } from './dto/logo-upload-response.dto';
import { LogoUploadDto } from './dto/logo-upload.dto';
import { UpdateClinicDto } from './dto/update-clinic.dto';

@ApiTags('clinic')
@ApiBearerAuth()
@Controller('clinic')
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  @Get()
  getCurrent(@CurrentClinic() clinic: ClinicEntity): Promise<ClinicResponse> {
    return this.clinicsService.getCurrent(clinic);
  }

  @Patch()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: UpdateClinicDto,
  ): Promise<ClinicResponse> {
    return this.clinicsService.update(clinic.id, dto);
  }

  @Post('logo-upload')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LogoUploadResponseDto })
  logoUpload(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: LogoUploadDto,
  ): Promise<LogoUploadResponseDto> {
    return this.clinicsService.getLogoUploadUrl(clinic.id, dto.contentType);
  }
}
