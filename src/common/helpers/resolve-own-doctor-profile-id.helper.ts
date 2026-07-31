import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { UserRole } from '../enums/user-role.enum';
import { JwtPayload } from '../types/jwt-payload.type';

// Resolves the requesting user's own doctorProfileId so read endpoints can
// silently scope "list everything" down to "list only what's mine" for the
// DOCTOR role. Returns null for every other role — meaning no doctor-scoping
// applies, not "match nothing".
export const resolveOwnDoctorProfileIdIfDoctor = async (
  doctorProfileRepository: Repository<DoctorProfileEntity>,
  clinicId: string,
  user: JwtPayload,
): Promise<string | null> => {
  if (user.role !== UserRole.DOCTOR) {
    return null;
  }

  const ownProfile = await doctorProfileRepository.findOne({
    where: { userId: user.sub, clinicId },
  });

  if (!ownProfile) {
    throw new NotFoundException('Doctor profile not found for current user');
  }

  return ownProfile.id;
};
