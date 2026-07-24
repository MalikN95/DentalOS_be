import { hash as bcryptHash } from 'bcrypt';
import { DataSource } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { BranchEntity } from '../../entities/branch.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { UserEntity } from '../../entities/user.entity';
import { ensureClinic } from './seed-clinic';
import { getSeedConfig } from './seed.config';

const BCRYPT_ROUNDS = 12;

interface DoctorSeed {
  specializations: string[];
  experienceYears: number;
  description: string;
  education: string[];
  /** Branch name from seed-branches; null keeps the doctor unassigned. */
  branchName: string | null;
}

interface StaffSeed {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  isActive?: boolean;
  doctor?: DoctorSeed;
}

const STAFF: StaffSeed[] = [
  {
    email: 'owner@maximum.local',
    firstName: 'Ольга',
    lastName: 'Соколова',
    phone: '+79001110001',
    role: UserRole.OWNER,
  },
  {
    email: 'manager@maximum.local',
    firstName: 'Сергей',
    lastName: 'Гущин',
    phone: '+79001110002',
    role: UserRole.ADMIN,
  },
  {
    email: 'ivanov@maximum.local',
    firstName: 'Иван',
    lastName: 'Иванов',
    phone: '+79001110003',
    role: UserRole.DOCTOR,
    doctor: {
      specializations: ['Терапевт', 'Хирург'],
      experienceYears: 12,
      description: 'Ведущий стоматолог-терапевт, лечение под микроскопом.',
      education: ['РНИМУ им. Н.И. Пирогова, 2011'],
      branchName: 'Центральный',
    },
  },
  {
    email: 'petrova@maximum.local',
    firstName: 'Мария',
    lastName: 'Петрова',
    phone: '+79001110004',
    role: UserRole.DOCTOR,
    doctor: {
      specializations: ['Ортодонт'],
      experienceYears: 7,
      description: 'Врач-ортодонт: брекет-системы и элайнеры.',
      education: ['МГМСУ им. А.И. Евдокимова, 2016'],
      branchName: 'Центральный',
    },
  },
  {
    email: 'kim@maximum.local',
    firstName: 'Алина',
    lastName: 'Ким',
    phone: '+79001110005',
    role: UserRole.DOCTOR,
    doctor: {
      specializations: ['Имплантолог', 'Хирург'],
      experienceYears: 15,
      description: 'Имплантация и костная пластика.',
      education: [
        'СПбГМУ им. И.П. Павлова, 2008',
        'Ординатура по хирургии, 2010',
      ],
      branchName: 'Филиал на Ленинском',
    },
  },
  {
    email: 'orlov@maximum.local',
    firstName: 'Дмитрий',
    lastName: 'Орлов',
    phone: '+79001110006',
    role: UserRole.DOCTOR,
    doctor: {
      specializations: ['Детский стоматолог'],
      experienceYears: 5,
      description: 'Детская стоматология, лечение в игровой форме.',
      education: ['КГМУ, 2018'],
      branchName: 'Филиал на Ленинском',
    },
  },
  {
    email: 'reception@maximum.local',
    firstName: 'Анна',
    lastName: 'Романова',
    phone: '+79001110007',
    role: UserRole.RECEPTIONIST,
  },
  {
    email: 'reception2@maximum.local',
    firstName: 'Екатерина',
    lastName: 'Волкова',
    phone: '+79001110008',
    role: UserRole.RECEPTIONIST,
  },
  {
    email: 'assistant@maximum.local',
    firstName: 'Дарья',
    lastName: 'Лебедева',
    phone: '+79001110009',
    role: UserRole.ASSISTANT,
  },
  {
    email: 'accountant@maximum.local',
    firstName: 'Нина',
    lastName: 'Тимофеева',
    phone: '+79001110010',
    role: UserRole.ACCOUNTANT,
  },
  {
    email: 'former.doctor@maximum.local',
    firstName: 'Павел',
    lastName: 'Зотов',
    phone: '+79001110011',
    role: UserRole.DOCTOR,
    isActive: false,
    doctor: {
      specializations: ['Терапевт'],
      experienceYears: 9,
      description: 'Не работает, профиль оставлен для истории приёмов.',
      education: [],
      branchName: null,
    },
  },
];

export const seedStaff = async (dataSource: DataSource): Promise<void> => {
  const config = getSeedConfig();
  const clinic = await ensureClinic(dataSource);
  const userRepository = dataSource.getRepository(UserEntity);
  const doctorRepository = dataSource.getRepository(DoctorProfileEntity);
  const branchRepository = dataSource.getRepository(BranchEntity);
  const passwordHash = await bcryptHash(config.staffPassword, BCRYPT_ROUNDS);

  const branches = await branchRepository.find({
    where: { clinicId: clinic.id },
  });
  const branchIdByName = new Map(
    branches.map((branch) => [branch.name, branch.id]),
  );

  await Promise.all(
    STAFF.map(async (member) => {
      const existing = await userRepository.findOne({
        where: { clinicId: clinic.id, email: member.email },
      });

      const user =
        existing ??
        (await userRepository.save(
          userRepository.create({
            clinicId: clinic.id,
            email: member.email,
            phone: member.phone,
            passwordHash,
            firstName: member.firstName,
            lastName: member.lastName,
            role: member.role,
            isActive: member.isActive ?? true,
            mfaEnabled: false,
          }),
        ));

      // eslint-disable-next-line no-console -- seed CLI output
      console.log(
        existing
          ? `Staff ${member.email} already exists`
          : `Created staff ${member.email} (${member.role})`,
      );

      if (!member.doctor) {
        return;
      }

      const existingProfile = await doctorRepository.findOne({
        where: { userId: user.id },
      });

      const branchId = member.doctor.branchName
        ? (branchIdByName.get(member.doctor.branchName) ?? null)
        : null;

      if (existingProfile) {
        // Backfill the branch for profiles seeded before branches existed.
        if (existingProfile.branchId === null && branchId !== null) {
          existingProfile.branchId = branchId;
          await doctorRepository.save(existingProfile);
          // eslint-disable-next-line no-console -- seed CLI output
          console.log(
            `Attached ${member.email} to "${member.doctor.branchName}"`,
          );
        }

        return;
      }

      await doctorRepository.save(
        doctorRepository.create({
          clinicId: clinic.id,
          userId: user.id,
          branchId,
          description: member.doctor.description,
          experienceYears: member.doctor.experienceYears,
          specializations: member.doctor.specializations,
          education: member.doctor.education,
          isActive: member.isActive ?? true,
        }),
      );
      // eslint-disable-next-line no-console -- seed CLI output
      console.log(`Created doctor profile for ${member.email}`);
    }),
  );
};
