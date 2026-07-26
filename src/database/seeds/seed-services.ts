import { DataSource } from 'typeorm';
import { ServiceCategoryEntity } from '../../entities/service-category.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { ensureClinic } from './seed-clinic';

interface ServiceSeed {
  name: string;
  price: string;
  durationMinutes: number;
  description: string;
}

interface CategorySeed {
  name: string;
  sortOrder: number;
  services: ServiceSeed[];
}

const CATEGORIES: CategorySeed[] = [
  {
    name: 'Терапия',
    sortOrder: 1,
    services: [
      {
        name: 'Профгигиена полости рта',
        price: '4500.00',
        durationMinutes: 60,
        description: 'Ультразвуковая чистка, полировка, фторирование.',
      },
      {
        name: 'Лечение кариеса',
        price: '6800.00',
        durationMinutes: 60,
        description: 'Лечение кариеса с постановкой светоотверждаемой пломбы.',
      },
      {
        name: 'Лечение пульпита',
        price: '12500.00',
        durationMinutes: 90,
        description: 'Эндодонтическое лечение канала под микроскопом.',
      },
    ],
  },
  {
    name: 'Хирургия',
    sortOrder: 2,
    services: [
      {
        name: 'Удаление зуба',
        price: '3500.00',
        durationMinutes: 30,
        description: 'Простое удаление зуба.',
      },
      {
        name: 'Удаление зуба мудрости',
        price: '9000.00',
        durationMinutes: 60,
        description: 'Сложное удаление ретинированного зуба мудрости.',
      },
    ],
  },
  {
    name: 'Ортодонтия',
    sortOrder: 3,
    services: [
      {
        name: 'Консультация ортодонта',
        price: '1500.00',
        durationMinutes: 30,
        description: 'Первичная консультация, план лечения.',
      },
      {
        name: 'Установка брекет-системы',
        price: '65000.00',
        durationMinutes: 120,
        description: 'Установка металлической брекет-системы на обе челюсти.',
      },
      {
        name: 'Коррекция брекет-системы',
        price: '2500.00',
        durationMinutes: 30,
        description: 'Плановая активация брекет-системы.',
      },
    ],
  },
  {
    name: 'Имплантология',
    sortOrder: 4,
    services: [
      {
        name: 'Имплантация зуба',
        price: '45000.00',
        durationMinutes: 90,
        description: 'Установка импланта с последующим протезированием.',
      },
      {
        name: 'Коронка на имплант',
        price: '28000.00',
        durationMinutes: 60,
        description: 'Изготовление и установка коронки на имплант.',
      },
    ],
  },
  {
    name: 'Детская стоматология',
    sortOrder: 5,
    services: [
      {
        name: 'Осмотр детского стоматолога',
        price: '1200.00',
        durationMinutes: 30,
        description: 'Первичный осмотр и консультация для детей.',
      },
      {
        name: 'Герметизация фиссур',
        price: '2200.00',
        durationMinutes: 30,
        description: 'Профилактическая герметизация фиссур молочных зубов.',
      },
    ],
  },
  {
    name: 'Эстетическая стоматология',
    sortOrder: 6,
    services: [
      {
        name: 'Отбеливание зубов',
        price: '15000.00',
        durationMinutes: 90,
        description: 'Профессиональное отбеливание ZOOM 4.',
      },
      {
        name: 'Реставрация зуба',
        price: '8500.00',
        durationMinutes: 60,
        description: 'Художественная реставрация зуба композитным материалом.',
      },
    ],
  },
];

/**
 * Creates demo service categories and services. Idempotent by (clinicId, name)
 * for both categories and services.
 */
export const seedServices = async (dataSource: DataSource): Promise<void> => {
  const clinic = await ensureClinic(dataSource);
  const categoryRepository = dataSource.getRepository(ServiceCategoryEntity);
  const serviceRepository = dataSource.getRepository(ServiceEntity);

  for (const category of CATEGORIES) {
    const existingCategory = await categoryRepository.findOne({
      where: { clinicId: clinic.id, name: category.name },
    });

    const categoryEntity =
      existingCategory ??
      (await categoryRepository.save(
        categoryRepository.create({
          clinicId: clinic.id,
          name: category.name,
          sortOrder: category.sortOrder,
          isActive: true,
        }),
      ));

    // eslint-disable-next-line no-console -- seed CLI output
    console.log(
      existingCategory
        ? `Category "${category.name}" already exists`
        : `Created category "${category.name}"`,
    );

    await Promise.all(
      category.services.map(async (service) => {
        const existingService = await serviceRepository.findOne({
          where: { clinicId: clinic.id, name: service.name },
        });

        if (existingService) {
          // eslint-disable-next-line no-console -- seed CLI output
          console.log(`Service "${service.name}" already exists`);
          return;
        }

        await serviceRepository.save(
          serviceRepository.create({
            clinicId: clinic.id,
            categoryId: categoryEntity.id,
            name: service.name,
            price: service.price,
            durationMinutes: service.durationMinutes,
            description: service.description,
            preparation: null,
            requiredEquipmentTypes: [],
            isActive: true,
          }),
        );
        // eslint-disable-next-line no-console -- seed CLI output
        console.log(`Created service "${service.name}"`);
      }),
    );
  }
};
