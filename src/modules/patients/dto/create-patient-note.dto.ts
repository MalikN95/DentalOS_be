import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePatientNoteDto {
  @ApiProperty({ example: 'Patient asked to be called before the appointment' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  text: string;
}
