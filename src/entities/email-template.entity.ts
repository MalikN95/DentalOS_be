import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ClinicEntity } from './clinic.entity';

@Entity('email_templates')
@Index(['clinicId'])
export class EmailTemplateEntity extends BaseEntity {
  @Column('uuid')
  clinicId: string;

  @ManyToOne(() => ClinicEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clinicId' })
  clinic: ClinicEntity;

  @Column()
  name: string;

  // May contain {{patientFirstName}}, {{patientLastName}}, {{clinicName}},
  // {{clinicPhone}}, {{clinicAddress}} placeholders, resolved at send time.
  @Column()
  subject: string;

  @Column({ type: 'text' })
  body: string;
}
