import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { MfaCodeDto } from './dto/mfa-code.dto';
import { MfaSetupResponseDto } from './dto/mfa-setup-response.dto';
import { MfaVerifyDto } from './dto/mfa-verify.dto';
import { TokensDto } from './dto/tokens.dto';
import { MfaService } from './mfa.service';

@ApiTags('auth')
@Controller('auth/mfa')
export class MfaController {
  constructor(private readonly mfaService: MfaService) {}

  @Post('setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOkResponse({ type: MfaSetupResponseDto })
  setup(@CurrentUser('sub') userId: string): Promise<MfaSetupResponseDto> {
    return this.mfaService.setup(userId);
  }

  @Post('enable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  enable(
    @CurrentUser('sub') userId: string,
    @Body() dto: MfaCodeDto,
  ): Promise<void> {
    return this.mfaService.enable(userId, dto.code);
  }

  @Post('disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  disable(
    @CurrentUser('sub') userId: string,
    @Body() dto: MfaCodeDto,
  ): Promise<void> {
    return this.mfaService.disable(userId, dto.code);
  }

  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokensDto })
  verify(@Body() dto: MfaVerifyDto): Promise<TokensDto> {
    return this.mfaService.verify(dto.mfaToken, dto.code);
  }
}
