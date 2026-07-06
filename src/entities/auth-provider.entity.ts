import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { UserEntity } from './user.entity';

export enum AuthProviderType {
  GOOGLE = 'google',
  APPLE = 'apple',
}

// External identity linked to a local user (Sign in with Google / Apple)
@Entity('auth_providers')
@Index(['provider', 'providerUserId'], { unique: true })
@Index(['userId'])
export class AuthProviderEntity extends BaseEntity {
  @Column('uuid')
  userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'enum', enum: AuthProviderType })
  provider: AuthProviderType;

  // 'sub' claim of the provider's ID token
  @Column()
  providerUserId: string;

  @Column({ type: 'varchar', nullable: true })
  email: string | null;
}
