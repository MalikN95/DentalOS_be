import { ApiProperty } from '@nestjs/swagger';
import { ToothCondition } from '../../../entities/tooth-mark.entity';

export class ToothStateDto {
  @ApiProperty({ example: 36 })
  toothNumber: number;

  @ApiProperty({ enum: ToothCondition })
  condition: ToothCondition;

  @ApiProperty({ type: String, nullable: true })
  comment: string | null;

  @ApiProperty({ description: 'Timestamp of the latest mark for this tooth' })
  updatedAt: Date;
}
