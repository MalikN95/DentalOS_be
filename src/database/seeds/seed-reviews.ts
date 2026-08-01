import { DataSource } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { AppointmentEntity } from '../../entities/appointment.entity';
import { ReviewEntity, ReviewStatus } from '../../entities/review.entity';
import { ensureClinic } from './seed-clinic';

const randomInt = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1));

const pickOne = <T>(items: T[]): T => items[randomInt(0, items.length - 1)];

// Weighted toward positive ratings, like most real clinic review sets, but with
// enough spread across 1-5 stars to be useful for testing the moderation UI.
const RATING_WEIGHTS: { rating: number; weight: number }[] = [
  { rating: 5, weight: 45 },
  { rating: 4, weight: 30 },
  { rating: 3, weight: 12 },
  { rating: 2, weight: 8 },
  { rating: 1, weight: 5 },
];

const pickRating = (): number => {
  const total = RATING_WEIGHTS.reduce((sum, { weight }) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const { rating, weight } of RATING_WEIGHTS) {
    roll -= weight;
    if (roll <= 0) return rating;
  }

  return RATING_WEIGHTS[0].rating;
};

const COMMENTS_BY_RATING: Record<number, string[]> = {
  5: [
    'Отличный врач, всё прошло безболезненно и быстро!',
    'Очень внимательный доктор, всё подробно объяснил. Рекомендую!',
    'Лучший стоматолог, к которому я обращался. Спасибо огромное!',
    'Профессионально, вежливо, никакой боли. Буду обращаться ещё.',
    'Очень доволен результатом, зуб как новый.',
  ],
  4: [
    'Хороший врач, но пришлось немного подождать своей очереди.',
    'Всё понравилось, единственное — хотелось бы больше пояснений по уходу.',
    'Приём прошёл хорошо, доктор компетентный.',
    'В целом всё отлично, немного дороговато, но того стоит.',
  ],
  3: [
    'Приём нормальный, но ничего особенного.',
    'Врач торопился, хотелось бы больше внимания к деталям.',
    'Средне — не понравилось, но и не разочаровало.',
  ],
  2: [
    'Долго ждал приёма, хотя был записан на конкретное время.',
    'Осталось неприятное послевкусие после лечения, пришлось идти на перепроверку.',
  ],
  1: [
    'Очень не понравилось обслуживание, буду искать другую клинику.',
    'Боль не прошла после приёма, чувствую себя обманутым.',
  ],
};

/**
 * Creates one review per completed appointment that doesn't already have one,
 * with a randomized 1-5 rating (weighted toward positive) and a matching
 * comment, backdated near the appointment. Most are marked `showInBooking`
 * (visible under the doctor's card in the public booking widget) and a
 * smaller share `featured` (curated for the future public landing page) —
 * only 4-5 star reviews are ever featured. Idempotent per appointment
 * (checked via appointmentId, which is unique on ReviewEntity).
 */
export const seedReviews = async (dataSource: DataSource): Promise<void> => {
  const clinic = await ensureClinic(dataSource);
  const appointmentRepository = dataSource.getRepository(AppointmentEntity);
  const reviewRepository = dataSource.getRepository(ReviewEntity);

  const completedAppointments = await appointmentRepository.find({
    where: { clinicId: clinic.id, status: AppointmentStatus.COMPLETED },
  });

  if (completedAppointments.length === 0) {
    // eslint-disable-next-line no-console -- seed CLI output
    console.log('No completed appointments found, skipping seed-reviews');
    return;
  }

  let createdCount = 0;

  for (const appointment of completedAppointments) {
    const existing = await reviewRepository.findOne({
      where: { appointmentId: appointment.id },
    });

    if (existing) continue;

    // Not every completed visit gets rated in real life either.
    if (Math.random() < 0.2) continue;

    const rating = pickRating();
    const showInBooking = Math.random() < 0.75;
    const featured = rating >= 4 && Math.random() < 0.3;

    const review = reviewRepository.create({
      clinicId: clinic.id,
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorProfileId: appointment.doctorProfileId,
      rating,
      comment: pickOne(COMMENTS_BY_RATING[rating]),
      status: ReviewStatus.PUBLISHED,
      requestToken: null,
      showInBooking,
      featured,
    });

    const saved = await reviewRepository.save(review);
    saved.createdAt = new Date(appointment.endsAt.getTime() + 60 * 60 * 1000);
    await reviewRepository.save(saved);

    createdCount += 1;
  }

  // eslint-disable-next-line no-console -- seed CLI output
  console.log(`Created ${createdCount} reviews`);
};
