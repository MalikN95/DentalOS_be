import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentClinic } from '../../common/decorators/current-clinic.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ClinicEntity } from '../../entities/clinic.entity';
import { ReviewEntity } from '../../entities/review.entity';
import { ListReviewsQueryDto } from './dto/list-reviews-query.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';
import { UpdateReviewFeaturedDto } from './dto/update-review-featured.dto';
import { UpdateReviewShowInBookingDto } from './dto/update-review-show-in-booking.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';
import { ReviewsService } from './reviews.service';
import {
  PaginatedResult,
  PublicReviewItem,
  ReviewRequestResult,
  SubmitReviewResult,
} from './types/reviews.types';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('request/:appointmentId')
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.RECEPTIONIST)
  requestReview(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<ReviewRequestResult> {
    return this.reviewsService.requestReview(clinic.id, appointmentId);
  }

  @Public()
  @Post('submit')
  @HttpCode(HttpStatus.OK)
  submit(@Body() dto: SubmitReviewDto): Promise<SubmitReviewResult> {
    return this.reviewsService.submit(dto);
  }

  @Get()
  @ApiBearerAuth()
  findAll(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: ListReviewsQueryDto,
  ): Promise<PaginatedResult<ReviewEntity>> {
    return this.reviewsService.findAll(clinic.id, query);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateStatus(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewStatusDto,
  ): Promise<ReviewEntity> {
    return this.reviewsService.updateStatus(clinic.id, id, dto);
  }

  @Patch(':id/featured')
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateFeatured(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewFeaturedDto,
  ): Promise<ReviewEntity> {
    return this.reviewsService.updateFeatured(clinic.id, id, dto);
  }

  @Patch(':id/show-in-booking')
  @ApiBearerAuth()
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  updateShowInBooking(
    @CurrentClinic() clinic: ClinicEntity,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewShowInBookingDto,
  ): Promise<ReviewEntity> {
    return this.reviewsService.updateShowInBooking(clinic.id, id, dto);
  }

  @Public()
  @Get('public')
  findPublic(
    @CurrentClinic() clinic: ClinicEntity,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<PublicReviewItem>> {
    return this.reviewsService.findPublic(clinic.id, query);
  }
}
