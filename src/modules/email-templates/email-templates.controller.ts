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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { EmailTemplateEntity } from '../../entities/email-template.entity';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import { EmailTemplatesService } from './email-templates.service';

const WRITE_ROLES = [UserRole.OWNER, UserRole.ADMIN] as const;

@ApiTags('email-templates')
@ApiBearerAuth()
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly emailTemplatesService: EmailTemplatesService) {}

  @Get()
  @ApiOkResponse({ type: [EmailTemplateEntity] })
  findAll(
    @CurrentClinic() clinic: ClinicEntity,
  ): Promise<EmailTemplateEntity[]> {
    return this.emailTemplatesService.findAll(clinic.id);
  }

  @Get(':id')
  @ApiOkResponse({ type: EmailTemplateEntity })
  findOne(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EmailTemplateEntity> {
    return this.emailTemplatesService.findOne(clinic.id, id);
  }

  @Post()
  @Roles(...WRITE_ROLES)
  @ApiCreatedResponse({ type: EmailTemplateEntity })
  create(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreateEmailTemplateDto,
  ): Promise<EmailTemplateEntity> {
    return this.emailTemplatesService.create(clinic.id, dto);
  }

  @Patch(':id')
  @Roles(...WRITE_ROLES)
  @ApiOkResponse({ type: EmailTemplateEntity })
  update(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmailTemplateDto,
  ): Promise<EmailTemplateEntity> {
    return this.emailTemplatesService.update(clinic.id, id, dto);
  }

  @Delete(':id')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.emailTemplatesService.remove(clinic.id, id);
  }
}
