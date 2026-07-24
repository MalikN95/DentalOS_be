import { hash as bcryptHash } from 'bcrypt';
import { DataSource } from 'typeorm';
import { UserRole } from '../../common/enums/user-role.enum';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { UserEntity } from '../../entities/user.entity';
import { ensureClinic } from './seed-clinic';
import { getSeedConfig } from './seed.config';

const BCRYPT_ROUNDS = 12;

interface DoctorSeed {
  specializations: string[];
  experienceYears: number;
  description: string;
}

interface StaffSeed {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: UserRole;
  doctor?: DoctorSeed;
}

const STAFF: StaffSeed[] = [
  {
    email: 'owner@maximum.local',
    firstName: 'Ольга',
    lastName: 'Владелец',
    phone: '+79001110001',
    role: UserRole.OWNER,
  },
  {
    email: 'ivanov@maximum.local',
    firstName: 'Иван',
    lastName: 'Иванов',
    phone: '+79001110002',
    role: UserRole.DOCTOR,
    doctor: {
      specializations: ['Терапевт', 'Хирург'],
      experienceYears: 12,
      description: 'Ведущий стоматолог-терапевт.',
    },
  },
  {
    email: 'petrova@maximum.local',
    firstName: 'Мария',
    lastName: 'Петрова',
    phone: '+79001110003',
    role: UserRole.DOCTOR,
    doctor: {
      specializations: ['Ортодонт'],
      experienceYears: 7,
      description: 'Врач-ортодонт, брекет-системы и элайнеры.',
    },
  },
  {
    email: 'reception@maximum.local',
    firstName: 'Анна',
    lastName: 'Регистратор',
    phone: '+79001110004',
    role: UserRole.RECEPTIONIST,
  },
  {
    email: 'assistant@maximum.local',
    firstName: 'Дарья',
    lastName: 'Ассистент',
    phone: '+79001110005',
    role: UserRole.ASSISTANT,
  },
];

export const seedStaff = async (dataSource: DataSource): Promise<void> => {
  const config = getSeedConfig();
  const clinic = await ensureClinic(dataSource);
  const userRepository = dataSource.getRepository(UserEntity);
  const doctorRepository = dataSource.getRepository(DoctorProfileEntity);
  const passwordHash = await bcryptHash(config.staffPassword, BCRYPT_ROUNDS);

  await Promise.all(
    STAFF.map(async (member) => {
      let user = await userRepository.findOne({
        where: { clinicId: clinic.id, email: member.email },
      });

      if (!user) {
        user = await userRepository.save(
          userRepository.create({
            clinicId: clinic.id,
            email: member.email,
            phone: member.phone,
            passwordHash,
            firstName: member.firstName,
            lastName: member.lastName,
            role: member.role,
            isActive: true,
            mfaEnabled: false,
          }),
        );
        // eslint-disable-next-line no-console -- seed output
        console.log(`Created staff ${member.email} (${member.role})`);
      } else {
        // eslint-disable-next-line no-console -- seed output
        console.log(`Staff ${member.email} already exists`);
      }

      if (!member.doctor) {
        return;
      }

      const existingProfile = await doctorRepository.findOne({
        where: { userId: user.id },
      });

      if (!existingProfile) {
        await doctorRepository.save(
          doctorRepository.create({
            clinicId: clinic.id,
            userId: user.id,
            branchId: null,
            description: member.doctor.description,
            experienceYears: member.doctor.experienceYears,
            specializations: member.doctor.specializations,
            education: [],
            isActive: true,
          }),
        );
        // eslint-disable-next-line no-console -- seed output
        console.log(`Created doctor profile for ${member.email}`);
      }
    }),
  );
};
