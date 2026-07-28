import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateEmailTemplateDto {
  @ApiProperty({ example: 'Напоминание о визите' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'Ждём вас, {{patientFirstName}}!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({
    example:
      'Здравствуйте, {{patientFirstName}} {{patientLastName}}! Напоминаем...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  body: string;
}
