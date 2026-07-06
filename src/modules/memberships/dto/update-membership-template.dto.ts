import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateMembershipTemplateDto } from './create-membership-template.dto';

export class UpdateMembershipTemplateDto extends PartialType(
  CreateMembershipTemplateDto,
) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
