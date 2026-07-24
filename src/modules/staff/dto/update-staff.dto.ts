import { PartialType } from '@nestjs/swagger';
import { CreateStaffDto } from './create-staff.dto';

/**
 * Every field is optional. `password` is only rehashed when provided,
 * so omitting it keeps the current credentials.
 */
export class UpdateStaffDto extends PartialType(CreateStaffDto) {}
