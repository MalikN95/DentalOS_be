import { ApiProperty } from '@nestjs/swagger';

export class BookingServiceDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Decimal string, e.g. "1500.00"' })
  price: string;

  @ApiProperty()
  durationMinutes: number;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;

  @ApiProperty({ type: String, nullable: true })
  preparation: string | null;
}

export class BookingServiceCategoryDto {
  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'null for uncategorized services',
  })
  id: string | null;

  @ApiProperty({ type: String, nullable: true })
  name: string | null;

  @ApiProperty({ type: [BookingServiceDto] })
  services: BookingServiceDto[];
}
