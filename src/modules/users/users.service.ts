import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  findByEmailWithPassword(
    clinicId: string,
    email: string,
  ): Promise<UserEntity | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.clinicId = :clinicId', { clinicId })
      .andWhere('user.email = :email', { email })
      .andWhere('user.isActive = true')
      .getOne();
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({ where: { id, isActive: true } });
  }

  async updateRefreshJti(userId: string, jti: string | null): Promise<void> {
    await this.usersRepository.update({ id: userId }, { refreshJti: jti });
  }

  async findRefreshJti(userId: string): Promise<string | null> {
    const row = await this.usersRepository
      .createQueryBuilder('user')
      .select('user.refreshJti', 'jti')
      .where('user.id = :userId', { userId })
      .andWhere('user.isActive = true')
      .getRawOne<{ jti: string | null }>();

    return row?.jti ?? null;
  }
}
