import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class BookingDoctorsQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  branchId: string;
}
