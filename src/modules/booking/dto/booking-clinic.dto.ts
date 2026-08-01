import { ApiProperty } from '@nestjs/swagger';

export class BookingClinicDto {
  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  logoUrl: string | null;

  @ApiProperty()
  currency: string;
}
