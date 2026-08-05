import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ClinicEntity } from '../../entities/clinic.entity';
import { MagicLinkVerifyDto } from './dto/magic-link-verify.dto';
import { SmsRequestDto } from './dto/sms-request.dto';
import { TokensDto } from './dto/tokens.dto';
import { SmsAuthService } from './sms-auth.service';

@ApiTags('auth')
@Controller('auth/:clinicSlug/sms')
export class SmsAuthController {
  constructor(private readonly smsAuthService: SmsAuthService) {}

  @Public()
  @Post('request')
  @HttpCode(HttpStatus.NO_CONTENT)
  requestLoginLink(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: SmsRequestDto,
  ): Promise<void> {
    return this.smsAuthService.requestLoginLink(clinic, dto.phone);
  }

  // Not scoped by :clinicSlug — the token alone identifies the clinic/phone
  // it was issued for (SmsAuthService#verifyLoginLink), so the magic-link
  // landing page only needs to send what's in its URL query string.
  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokensDto })
  verifyLoginLink(@Body() dto: MagicLinkVerifyDto): Promise<TokensDto> {
    return this.smsAuthService.verifyLoginLink(dto.token);
  }
}
