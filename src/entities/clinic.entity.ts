import { Column, Entity } from 'typeorm';
import { WorkingHours } from '../common/types/working-hours.type';
import { BaseEntity } from './base.entity';

@Entity('clinics')
export class ClinicEntity extends BaseEntity {
  @Column()
  name: string;

  // URL-safe identifier for the public booking widget: app.dentalos.com/book/{slug}
  @Column({ unique: true })
  slug: string;

  // S3 object key, download via presigned URL
  @Column({ nullable: true, type: 'varchar' })
  logoKey: string | null;

  @Column({ nullable: true, type: 'varchar' })
  address: string | null;

  @Column({ nullable: true, type: 'varchar' })
  phone: string | null;

  @Column({ nullable: true, type: 'varchar' })
  email: string | null;

  @Column({ type: 'jsonb', nullable: true })
  workingHours: WorkingHours | null;

  @Column({ default: 'UTC' })
  timezone: string;

  @Column({ default: 'USD', length: 3 })
  currency: string;

  @Column({ default: 'en', length: 5 })
  language: string;

  @Column({ default: true })
  isActive: boolean;
}
