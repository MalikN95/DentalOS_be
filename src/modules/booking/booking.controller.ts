import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ClinicEntity } from '../../entities/clinic.entity';
import { AvailabilityService } from './availability.service';
import { BookingService } from './booking.service';
import { BookingBranchDto } from './dto/booking-branch.dto';
import { BookingClinicDto } from './dto/booking-clinic.dto';
import { BookingConfirmationDto } from './dto/booking-confirmation.dto';
import { BookingDaysQueryDto } from './dto/booking-days-query.dto';
import { BookingDoctorDto } from './dto/booking-doctor.dto';
import { BookingDoctorsQueryDto } from './dto/booking-doctors-query.dto';
import { BookingServiceCategoryDto } from './dto/booking-service-category.dto';
import { BookingSlotsQueryDto } from './dto/booking-slots-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('booking')
@Controller('booking/:clinicSlug')
export class BookingController {
  constructor(
    private readonly bookingService: BookingService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Public()
  @Get('clinic')
  @ApiOkResponse({ type: BookingClinicDto })
  getClinicInfo(
    @CurrentClinic() clinic: ClinicEntity,
  ): Promise<BookingClinicDto> {
    return this.bookingService.getClinicInfo(clinic);
  }

  @Public()
  @Get('branches')
  @ApiOkResponse({ type: [BookingBranchDto] })
  getBranches(
    @CurrentClinic() clinic: ClinicEntity,
  ): Promise<BookingBranchDto[]> {
    return this.bookingService.getBranches(clinic.id);
  }

  @Public()
  @Get('services')
  @ApiOkResponse({ type: [BookingServiceCategoryDto] })
  getServices(
    @CurrentClinic() clinic: ClinicEntity,
  ): Promise<BookingServiceCategoryDto[]> {
    return this.bookingService.getServices(clinic.id);
  }

  @Public()
  @Get('doctors')
  @ApiOkResponse({ type: [BookingDoctorDto] })
  getDoctors(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: BookingDoctorsQueryDto,
  ): Promise<BookingDoctorDto[]> {
    return this.bookingService.getDoctors(clinic.id, query);
  }

  @Public()
  @Get('days')
  @ApiOkResponse({
    type: [String],
    description: 'Dates (YYYY-MM-DD) with at least one free slot',
  })
  getDays(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: BookingDaysQueryDto,
  ): Promise<string[]> {
    return this.availabilityService.getAvailableDays(
      {
        clinicId: clinic.id,
        doctorProfileId: query.doctorProfileId,
        serviceId: query.serviceId,
        branchId: query.branchId,
      },
      query.month,
    );
  }

  @Public()
  @Get('slots')
  @ApiOkResponse({
    type: [String],
    description: 'Free slot start times (HH:mm)',
  })
  getSlots(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: BookingSlotsQueryDto,
  ): Promise<string[]> {
    return this.availabilityService.getAvailableSlots(
      {
        clinicId: clinic.id,
        doctorProfileId: query.doctorProfileId,
        serviceId: query.serviceId,
        branchId: query.branchId,
      },
      query.date,
    );
  }

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: BookingConfirmationDto })
  createBooking(
    @CurrentClinic() clinic: ClinicEntity,
    @Body() dto: CreateBookingDto,
  ): Promise<BookingConfirmationDto> {
    return this.bookingService.createBooking(clinic, dto);
  }
}
