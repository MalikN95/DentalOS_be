import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClinicEntity } from '../../entities/clinic.entity';

@Injectable()
export class ClinicsService {
  constructor(
    @InjectRepository(ClinicEntity)
    private readonly clinicsRepository: Repository<ClinicEntity>,
  ) {}

  findBySubdomain(subdomain: string): Promise<ClinicEntity | null> {
    return this.clinicsRepository.findOne({
      where: { subdomain: subdomain.toLowerCase(), isActive: true },
    });
  }

  findById(id: string): Promise<ClinicEntity | null> {
    return this.clinicsRepository.findOne({ where: { id, isActive: true } });
  }
}
