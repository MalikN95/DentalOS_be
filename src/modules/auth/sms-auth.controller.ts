import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ClinicEntity } from '../../entities/clinic.entity';
import { SmsRequestDto } from './dto/sms-request.dto';
import { SmsVerifyDto } from './dto/sms-verify.dto';
import { TokensDto } from './dto/tokens.dto';
import { SmsAuthService } from './sms-auth.service';

@ApiTags('auth')
@Controller('auth/:clinicSlug/sms')
export class SmsAuthController {
  constructor(private readonly smsAuthService: SmsAuthService) {}

  @Public()
  @Post('request')
  @HttpCode(HttpStatus.NO_CONTENT)
  requestCode(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: SmsRequestDto,
  ): Promise<void> {
    return this.smsAuthService.requestCode(clinic.id, dto.phone);
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokensDto })
  verifyCode(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: SmsVerifyDto,
  ): Promise<TokensDto> {
    return this.smsAuthService.verifyCode(clinic.id, dto.phone, dto.code);
  }
}
