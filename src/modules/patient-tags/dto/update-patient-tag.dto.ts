import { PartialType } from '@nestjs/swagger';
import { CreatePatientTagDto } from './create-patient-tag.dto';

export class UpdatePatientTagDto extends PartialType(CreatePatientTagDto) {}
