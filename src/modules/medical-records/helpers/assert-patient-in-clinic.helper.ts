import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { PatientEntity } from '../../../entities/patient.entity';

export const assertPatientInClinic = async (
  patientRepository: Repository<PatientEntity>,
  patientId: string,
  clinicId: string,
): Promise<PatientEntity> => {
  const patient = await patientRepository.findOne({
    where: { id: patientId, clinicId },
  });

  if (!patient) {
    throw new NotFoundException('Patient not found in this clinic');
  }

  return patient;
};
