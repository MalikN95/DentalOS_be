import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UserRole } from '../../../common/enums/user-role.enum';
import { JwtPayload } from '../../../common/types/jwt-payload.type';
import { DoctorProfileEntity } from '../../../entities/doctor-profile.entity';

// Doctors always write on behalf of their own profile;
// other staff must pass an explicit doctorProfileId
export const resolveDoctorProfileId = async (
  doctorProfileRepository: Repository<DoctorProfileEntity>,
  clinicId: string,
  user: JwtPayload,
  doctorProfileId?: string,
): Promise<string> => {
  if (user.role === UserRole.DOCTOR) {
    const ownProfile = await doctorProfileRepository.findOne({
      where: { userId: user.sub, clinicId },
    });

    if (!ownProfile) {
      throw new NotFoundException('Doctor profile not found for current user');
    }

    return ownProfile.id;
  }

  if (!doctorProfileId) {
    throw new BadRequestException(
      'doctorProfileId is required for non-doctor users',
    );
  }

  const profile = await doctorProfileRepository.findOne({
    where: { id: doctorProfileId, clinicId },
  });

  if (!profile) {
    throw new NotFoundException('Doctor profile not found in this clinic');
  }

  return profile.id;
};
