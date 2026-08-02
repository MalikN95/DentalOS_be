import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';
import { UserEntity } from './user.entity';

// Single clinic-wide team chat channel — every staff member in the clinic
// reads and posts to the same stream, there's no DM/group concept yet.
@Entity('chat_messages')
@Index(['clinicId', 'createdAt'])
export class ChatMessageEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column('uuid')
  authorId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author: UserEntity;

  @Column({ type: 'text' })
  body: string;
}
