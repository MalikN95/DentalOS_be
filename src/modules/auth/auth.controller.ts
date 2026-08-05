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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService, MeResponse } from './auth.service';
import { AvatarUploadResponseDto } from './dto/avatar-upload-response.dto';
import { AvatarUploadDto } from './dto/avatar-upload.dto';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RefreshDto } from './dto/refresh.dto';
import { TokensDto } from './dto/tokens.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TokensDto })
  refresh(@Body() dto: RefreshDto): Promise<TokensDto> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  logout(@CurrentUser('sub') userId: string): Promise<void> {
    return this.authService.logout(userId);
  }

  @Get('me')
  @ApiBearerAuth()
  getMe(@CurrentUser('sub') userId: string): Promise<MeResponse> {
    return this.authService.getMe(userId);
  }

  @Patch('me')
  @ApiBearerAuth()
  updateMe(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<MeResponse> {
    return this.authService.updateProfile(userId, dto);
  }

  @Post('me/avatar-upload')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOkResponse({ type: AvatarUploadResponseDto })
  avatarUpload(
    @CurrentUser('sub') userId: string,
    @Body() dto: AvatarUploadDto,
  ): Promise<AvatarUploadResponseDto> {
    return this.authService.getAvatarUploadUrl(userId, dto.contentType);
  }
}
