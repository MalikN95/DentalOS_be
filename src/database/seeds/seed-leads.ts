import { DataSource } from 'typeorm';
import { LeadEntity, LeadStage } from '../../entities/lead.entity';
import { ensureClinic } from './seed-clinic';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface LeadSeed {
  name: string;
  phone: string;
  stage: LeadStage;
  source: string;
  createdDaysAgo: number;
}

const SOURCES = [
  'Онлайн-запись',
  'Звонок',
  'Рекомендация',
  'Реклама Instagram',
  'Сайт',
];

const STAGE_WEIGHTS: [LeadStage, number][] = [
  [LeadStage.NEW, 0.28],
  [LeadStage.CONFIRMED, 0.2],
  [LeadStage.ARRIVED, 0.15],
  [LeadStage.PAID, 0.22],
  [LeadStage.REPEAT_VISIT, 0.08],
  [LeadStage.LOST, 0.07],
];

const FIRST_NAMES = [
  'Игорь',
  'Светлана',
  'Денис',
  'Оксана',
  'Вадим',
  'Татьяна',
  'Григорий',
  'Людмила',
  'Станислав',
  'Инна',
  'Валерий',
  'Жанна',
];
const LAST_NAMES = [
  'Соловьёв',
  'Панова',
  'Козлов',
  'Белова',
  'Фролов',
  'Гаврилова',
  'Артемьев',
  'Сафонова',
  'Литвинов',
  'Данилова',
  'Мельник',
  'Уварова',
];

const randomInt = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1));

const pickWeighted = <T>(options: [T, number][]): T => {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [value, weight] of options) {
    roll -= weight;
    if (roll <= 0) return value;
  }

  return options[options.length - 1][0];
};

const LEAD_COUNT = 30;

const buildLeads = (): LeadSeed[] =>
  Array.from({ length: LEAD_COUNT }, (_, index) => ({
    name: `${LAST_NAMES[index % LAST_NAMES.length]} ${FIRST_NAMES[index % FIRST_NAMES.length]}`,
    phone: `+7900444${String(index + 1).padStart(4, '0')}`,
    stage: pickWeighted(STAGE_WEIGHTS),
    source: SOURCES[index % SOURCES.length],
    createdDaysAgo: randomInt(0, 29),
  }));

/**
 * Creates a spread of CRM leads across the funnel stages for the last 30
 * days, so the conversion analytics widget has real data. Idempotent by
 * (clinicId, phone).
 */
export const seedLeads = async (dataSource: DataSource): Promise<void> => {
  const clinic = await ensureClinic(dataSource);
  const leadRepository = dataSource.getRepository(LeadEntity);

  const existingCount = await leadRepository.count({
    where: { clinicId: clinic.id },
  });

  if (existingCount > 0) {
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(
      `Clinic already has ${existingCount} leads, skipping seed-leads`,
    );
    return;
  }

  const leads = buildLeads().map((lead) => {
    const entity = leadRepository.create({
      clinicId: clinic.id,
      name: lead.name,
      phone: lead.phone,
      email: null,
      stage: lead.stage,
      source: lead.source,
      patientId: null,
      appointmentId: null,
      comment: null,
    });
    entity.createdAt = new Date(Date.now() - lead.createdDaysAgo * MS_PER_DAY);
    return entity;
  });

  await leadRepository.save(leads);
  // eslint-disable-next-line no-console -- seed CLI output
  console.log(`Created ${leads.length} leads`);
};
