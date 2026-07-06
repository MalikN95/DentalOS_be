import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SellMembershipDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patientId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  templateId: string;
}
