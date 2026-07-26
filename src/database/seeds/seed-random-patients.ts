import { DataSource } from 'typeorm';
import { Gender } from '../../common/enums/gender.enum';
import { PatientEntity } from '../../entities/patient.entity';
import { ensureClinic } from './seed-clinic';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface RandomPatientSeed {
  firstName: string;
  lastName: string;
  gender: Gender;
  /** How many days before the seed run this patient "registered". 0 = today. */
  registeredDaysAgo: number;
}

// A pool of plausible Russian patients, backdated across the last ~2 months
// so the dashboard's "new patients" stat has something to show for every day range.
const RANDOM_PATIENTS: RandomPatientSeed[] = [
  {
    firstName: 'Максим',
    lastName: 'Беляев',
    gender: Gender.MALE,
    registeredDaysAgo: 0,
  },
  {
    firstName: 'Виктория',
    lastName: 'Титова',
    gender: Gender.FEMALE,
    registeredDaysAgo: 0,
  },
  {
    firstName: 'Артём',
    lastName: 'Гончаров',
    gender: Gender.MALE,
    registeredDaysAgo: 1,
  },
  {
    firstName: 'Полина',
    lastName: 'Жукова',
    gender: Gender.FEMALE,
    registeredDaysAgo: 1,
  },
  {
    firstName: 'Кирилл',
    lastName: 'Фомин',
    gender: Gender.MALE,
    registeredDaysAgo: 2,
  },
  {
    firstName: 'Анастасия',
    lastName: 'Захарова',
    gender: Gender.FEMALE,
    registeredDaysAgo: 3,
  },
  {
    firstName: 'Роман',
    lastName: 'Кириллов',
    gender: Gender.MALE,
    registeredDaysAgo: 4,
  },
  {
    firstName: 'Дарья',
    lastName: 'Никитина',
    gender: Gender.FEMALE,
    registeredDaysAgo: 5,
  },
  {
    firstName: 'Егор',
    lastName: 'Афанасьев',
    gender: Gender.MALE,
    registeredDaysAgo: 6,
  },
  {
    firstName: 'Ксения',
    lastName: 'Медведева',
    gender: Gender.FEMALE,
    registeredDaysAgo: 7,
  },
  {
    firstName: 'Владислав',
    lastName: 'Кузьмин',
    gender: Gender.MALE,
    registeredDaysAgo: 9,
  },
  {
    firstName: 'Алина',
    lastName: 'Дмитриева',
    gender: Gender.FEMALE,
    registeredDaysAgo: 11,
  },
  {
    firstName: 'Никита',
    lastName: 'Воробьёв',
    gender: Gender.MALE,
    registeredDaysAgo: 13,
  },
  {
    firstName: 'Вероника',
    lastName: 'Степанова',
    gender: Gender.FEMALE,
    registeredDaysAgo: 15,
  },
  {
    firstName: 'Тимофей',
    lastName: 'Быков',
    gender: Gender.MALE,
    registeredDaysAgo: 18,
  },
  {
    firstName: 'Милана',
    lastName: 'Егорова',
    gender: Gender.FEMALE,
    registeredDaysAgo: 21,
  },
  {
    firstName: 'Данила',
    lastName: 'Максимов',
    gender: Gender.MALE,
    registeredDaysAgo: 24,
  },
  {
    firstName: 'Юлия',
    lastName: 'Соловьёва',
    gender: Gender.FEMALE,
    registeredDaysAgo: 27,
  },
  {
    firstName: 'Богдан',
    lastName: 'Виноградов',
    gender: Gender.MALE,
    registeredDaysAgo: 31,
  },
  {
    firstName: 'Марина',
    lastName: 'Крылова',
    gender: Gender.FEMALE,
    registeredDaysAgo: 35,
  },
  {
    firstName: 'Александр',
    lastName: 'Прохоров',
    gender: Gender.MALE,
    registeredDaysAgo: 39,
  },
  {
    firstName: 'Софья',
    lastName: 'Голубева',
    gender: Gender.FEMALE,
    registeredDaysAgo: 44,
  },
  {
    firstName: 'Илья',
    lastName: 'Симонов',
    gender: Gender.MALE,
    registeredDaysAgo: 49,
  },
  {
    firstName: 'Евгения',
    lastName: 'Орлова',
    gender: Gender.FEMALE,
    registeredDaysAgo: 55,
  },
];

const phoneFor = (index: number): string =>
  `+7900333${String(index + 1).padStart(4, '0')}`;

/**
 * Adds a pool of backdated random patients (on top of the curated ones in
 * seed-patients.ts) so lists, history and "new patients" stats have real
 * volume. Idempotent by (clinicId, phone).
 */
export const seedRandomPatients = async (
  dataSource: DataSource,
): Promise<void> => {
  const clinic = await ensureClinic(dataSource);
  const patientRepository = dataSource.getRepository(PatientEntity);

  await Promise.all(
    RANDOM_PATIENTS.map(async (seed, index) => {
      const phone = phoneFor(index);
      const existing = await patientRepository.findOne({
        where: { clinicId: clinic.id, phone },
      });

      if (existing) {
        // eslint-disable-next-line no-console -- seed output
        console.log(`Patient ${phone} already exists`);
        return;
      }

      const patient = patientRepository.create({
        clinicId: clinic.id,
        userId: null,
        firstName: seed.firstName,
        lastName: seed.lastName,
        phone,
        email: null,
        birthDate: null,
        gender: seed.gender,
        insurance: null,
        allergies: [],
        chronicDiseases: [],
        comments: null,
        isActive: true,
      });

      // Backdate createdAt so registration dates spread realistically;
      // TypeORM only auto-fills @CreateDateColumn when the value is unset.
      patient.createdAt = new Date(
        Date.now() - seed.registeredDaysAgo * MS_PER_DAY,
      );

      await patientRepository.save(patient);
      // eslint-disable-next-line no-console -- seed output
      console.log(
        `Created patient ${seed.lastName} ${seed.firstName} (${phone})`,
      );
    }),
  );
};
