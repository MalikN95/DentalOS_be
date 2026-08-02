import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { SendPatientEmailDto } from './dto/send-patient-email.dto';
import { EmailsService } from './emails.service';

const SEND_ROLES = [
  UserRole.OWNER,
  UserRole.ADMIN,
  UserRole.DOCTOR,
  UserRole.RECEPTIONIST,
] as const;

@ApiTags('emails')
@ApiBearerAuth()
@Controller('patients/:patientId/emails')
export class EmailsController {
  constructor(private readonly emailsService: EmailsService) {}

  @Post()
  @Roles(...SEND_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  send(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: SendPatientEmailDto,
  ): Promise<void> {
    return this.emailsService.sendToPatient(clinic, patientId, dto, userId);
  }
}
