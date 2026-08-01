import { ApiProperty } from '@nestjs/swagger';
import { AppointmentStatus } from '../../../common/enums/appointment-status.enum';

export class BookingConfirmationDto {
  @ApiProperty({ format: 'uuid' })
  appointmentId: string;

  // Lets the widget register a push-notification device token against this
  // patient right after booking (POST /booking/:clinicSlug/push-subscription).
  @ApiProperty({ format: 'uuid' })
  patientId: string;

  @ApiProperty({ enum: AppointmentStatus })
  status: AppointmentStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  startsAt: Date;

  @ApiProperty()
  doctorName: string;

  @ApiProperty()
  serviceName: string;

  @ApiProperty()
  branchAddress: string;
}
