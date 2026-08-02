import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListPatientMessagesQueryDto extends PaginationQueryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patientId: string;
}
