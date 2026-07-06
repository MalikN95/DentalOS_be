import { PatientFileEntity } from '../../entities/patient-file.entity';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export type PatientFileWithUrl = PatientFileEntity & { downloadUrl: string };
