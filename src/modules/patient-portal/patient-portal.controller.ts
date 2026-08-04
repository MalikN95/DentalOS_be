import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { ReviewEntity } from '../../entities/review.entity';
import { BookForPatientDto } from '../booking/dto/book-for-patient.dto';
import { BookingBranchDto } from '../booking/dto/booking-branch.dto';
import { BookingConfirmationDto } from '../booking/dto/booking-confirmation.dto';
import { BookingDaysQueryDto } from '../booking/dto/booking-days-query.dto';
import { BookingDoctorDto } from '../booking/dto/booking-doctor.dto';
import { BookingDoctorsQueryDto } from '../booking/dto/booking-doctors-query.dto';
import { BookingServiceCategoryDto } from '../booking/dto/booking-service-category.dto';
import { BookingSlotsQueryDto } from '../booking/dto/booking-slots-query.dto';
import { PaginationQueryDto } from '../chat/dto/pagination-query.dto';
import { PatientMessageSummary } from '../chat/types/chat.types';
import { PaginatedResult } from '../chat/types/paginated-result.type';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { ListPatientAppointmentsQueryDto } from './dto/list-patient-appointments-query.dto';
import { SendPatientPortalMessageDto } from './dto/send-patient-portal-message.dto';
import { SubmitPatientReviewDto } from './dto/submit-patient-review.dto';
import { PatientPortalService } from './patient-portal.service';
import {
  PatientPortalAppointmentSummary,
  PatientPortalProfile,
} from './types/patient-portal.types';

// The patient's own view of their data — every method resolves the calling
// patient from the JWT (clinicId + sub), never from a client-supplied id.
@ApiTags('patient-portal')
@ApiBearerAuth()
@Roles(UserRole.PATIENT)
@Controller('patient')
export class PatientPortalController {
  constructor(private readonly patientPortalService: PatientPortalService) {}

  @Get('me')
  getProfile(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
  ): Promise<PatientPortalProfile> {
    return this.patientPortalService.getProfile(clinic.id, userId);
  }

  @Get('appointments')
  listAppointments(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
    @Query() query: ListPatientAppointmentsQueryDto,
  ): Promise<PatientPortalAppointmentSummary[]> {
    return this.patientPortalService.listAppointments(
      clinic.id,
      userId,
      query.scope,
    );
  }

  @Patch('appointments/:id/cancel')
  cancelAppointment(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelAppointmentDto,
  ): Promise<PatientPortalAppointmentSummary> {
    return this.patientPortalService.cancelAppointment(
      clinic.id,
      userId,
      id,
      dto.reason,
    );
  }

  @Get('messages')
  listMessages(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<PatientMessageSummary>> {
    return this.patientPortalService.listMessages(clinic.id, userId, query);
  }

  @Post('messages')
  sendMessage(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendPatientPortalMessageDto,
  ): Promise<PatientMessageSummary> {
    return this.patientPortalService.sendMessage(clinic.id, userId, dto.body);
  }

  @Get('reviews')
  listMyReviews(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
  ): Promise<ReviewEntity[]> {
    return this.patientPortalService.listMyReviews(clinic.id, userId);
  }

  @Put('appointments/:id/review')
  submitReview(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitPatientReviewDto,
  ): Promise<ReviewEntity> {
    return this.patientPortalService.submitReview(
      clinic.id,
      userId,
      id,
      dto.rating,
      dto.comment,
    );
  }

  @Get('booking/branches')
  getBookingBranches(
    @CurrentClinic() clinic: ClinicEntity,
  ): Promise<BookingBranchDto[]> {
    return this.patientPortalService.getBookingBranches(clinic.id);
  }

  @Get('booking/services')
  getBookingServices(
    @CurrentClinic() clinic: ClinicEntity,
  ): Promise<BookingServiceCategoryDto[]> {
    return this.patientPortalService.getBookingServices(clinic.id);
  }

  @Get('booking/doctors')
  getBookingDoctors(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: BookingDoctorsQueryDto,
  ): Promise<BookingDoctorDto[]> {
    return this.patientPortalService.getBookingDoctors(clinic.id, query);
  }

  @Get('booking/days')
  getBookingDays(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: BookingDaysQueryDto,
  ): Promise<string[]> {
    return this.patientPortalService.getBookingDays(
      clinic.id,
      query.doctorProfileId,
      query.serviceId,
      query.branchId,
      query.month,
    );
  }

  @Get('booking/slots')
  getBookingSlots(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: BookingSlotsQueryDto,
  ): Promise<string[]> {
    return this.patientPortalService.getBookingSlots(
      clinic.id,
      query.doctorProfileId,
      query.serviceId,
      query.branchId,
      query.date,
    );
  }

  @Post('booking')
  bookAppointment(
    @CurrentClinic() clinic: ClinicEntity,
    @CurrentUser('sub') userId: string,
    @Body() dto: BookForPatientDto,
  ): Promise<BookingConfirmationDto> {
    return this.patientPortalService.bookAppointment(clinic, userId, dto);
  }
}
