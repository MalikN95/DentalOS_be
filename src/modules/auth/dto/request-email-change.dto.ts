import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RequestEmailChangeDto {
  @ApiProperty({ example: 'new.email@clinic.com' })
  @IsEmail()
  newEmail: string;
}
