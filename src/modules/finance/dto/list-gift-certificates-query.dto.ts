import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { GiftCertificateStatus } from '../../../entities/gift-certificate.entity';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListGiftCertificatesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: GiftCertificateStatus })
  @IsOptional()
  @IsEnum(GiftCertificateStatus)
  status?: GiftCertificateStatus;
}
