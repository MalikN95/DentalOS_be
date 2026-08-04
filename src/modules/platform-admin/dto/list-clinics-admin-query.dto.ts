import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class ListClinicsAdminQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by clinic name or slug (ILIKE)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by active/blocked status; omit to return both',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value as unknown;
  })
  @IsBoolean()
  isActive?: boolean;
}
