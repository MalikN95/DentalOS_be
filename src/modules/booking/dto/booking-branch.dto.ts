import { ApiProperty } from '@nestjs/swagger';
import { WorkingHours } from '../../../common/types/working-hours.type';

export class BookingBranchDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  address: string;

  @ApiProperty({ type: String, nullable: true })
  phone: string | null;

  @ApiProperty({ type: String, nullable: true })
  latitude: string | null;

  @ApiProperty({ type: String, nullable: true })
  longitude: string | null;

  @ApiProperty({ type: Object, nullable: true })
  workingHours: WorkingHours | null;
}
