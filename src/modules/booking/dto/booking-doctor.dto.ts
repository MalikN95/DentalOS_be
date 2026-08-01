import { ApiProperty } from '@nestjs/swagger';

export class BookingDoctorDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  // Always set: getDoctors() only returns doctors with a resolved branch,
  // since the widget no longer asks the patient to pick one.
  @ApiProperty({ format: 'uuid' })
  branchId: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty({ type: String, nullable: true })
  photoUrl: string | null;

  @ApiProperty({ type: [String] })
  specializations: string[];

  @ApiProperty()
  experienceYears: number;

  @ApiProperty({ type: String, nullable: true })
  description: string | null;
}
