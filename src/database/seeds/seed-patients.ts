import { DataSource } from 'typeorm';
import { Gender } from '../../common/enums/gender.enum';
import { PatientEntity } from '../../entities/patient.entity';
import { ensureClinic } from './seed-clinic';

interface PatientSeed {
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  birthDate: string | null;
  gender: Gender | null;
  allergies: string[];
  chronicDiseases: string[];
}

const PATIENTS: PatientSeed[] = [
  {
    firstName: 'Пётр',
    lastName: 'Смирнов',
    phone: '+79002220001',
    email: 'smirnov@example.com',
    birthDate: '1990-05-14',
    gender: Gender.MALE,
    allergies: ['пенициллин'],
    chronicDiseases: [],
  },
  {
    firstName: 'Елена',
    lastName: 'Кузнецова',
    phone: '+79002220002',
    email: 'kuznetsova@example.com',
    birthDate: '1985-11-02',
    gender: Gender.FEMALE,
    allergies: [],
    chronicDiseases: ['гипертония'],
  },
  {
    firstName: 'Алексей',
    lastName: 'Соколов',
    phone: '+79002220003',
    email: null,
    birthDate: '2001-03-27',
    gender: Gender.MALE,
    allergies: ['латекс'],
    chronicDiseases: [],
  },
  {
    firstName: 'Наталья',
    lastName: 'Морозова',
    phone: '+79002220004',
    email: 'morozova@example.com',
    birthDate: '1978-09-19',
    gender: Gender.FEMALE,
    allergies: [],
    chronicDiseases: ['диабет 2 типа'],
  },
];

export const seedPatients = async (dataSource: DataSource): Promise<void> => {
  const clinic = await ensureClinic(dataSource);
  const patientRepository = dataSource.getRepository(PatientEntity);

  await Promise.all(
    PATIENTS.map(async (patient) => {
      const existing = await patientRepository.findOne({
        where: { clinicId: clinic.id, phone: patient.phone },
      });

      if (existing) {
        // eslint-disable-next-line no-console -- seed output
        console.log(`Patient ${patient.phone} already exists`);
        return;
      }

      await patientRepository.save(
        patientRepository.create({
          clinicId: clinic.id,
          userId: null,
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone,
          email: patient.email,
          birthDate: patient.birthDate,
          gender: patient.gender,
          insurance: null,
          allergies: patient.allergies,
          chronicDiseases: patient.chronicDiseases,
          comments: null,
          isActive: true,
        }),
      );
      // eslint-disable-next-line no-console -- seed output
      console.log(
        `Created patient ${patient.lastName} ${patient.firstName} (${patient.phone})`,
      );
    }),
  );
};
