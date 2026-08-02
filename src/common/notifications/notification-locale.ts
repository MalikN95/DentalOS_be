import { Repository } from 'typeorm';
import { ClinicEntity } from '../../entities/clinic.entity';

// Mirrors the languages the frontend's Settings page lets a clinic pick
// (src/helpers/locale-options.ts in DentalOS_fe): ru/en/ky.
export type NotificationLocale = 'ru' | 'en' | 'ky';

const SUPPORTED_LOCALES: readonly string[] = ['ru', 'en', 'ky'];

// `ClinicEntity.language` defaults to 'en' and is free-form at the column
// level, so an unrecognized/legacy value falls back to 'en' too.
export const resolveNotificationLocale = (
  language: string | null | undefined,
): NotificationLocale =>
  (SUPPORTED_LOCALES.includes(language ?? '')
    ? language
    : 'en') as NotificationLocale;

export const NOTIFICATION_LOCALE_INTL_TAG: Record<NotificationLocale, string> =
  {
    ru: 'ru-RU',
    en: 'en-US',
    ky: 'ky-KG',
  };

export interface ClinicNotificationContext {
  locale: NotificationLocale;
  clinicName: string;
}

// Resolves both what language to write a message in and the clinic name to
// show as the email sender's display name — every call site that sends a
// notification needs both, so they're fetched together in one query.
export const resolveClinicNotificationContext = async (
  clinicsRepository: Repository<ClinicEntity>,
  clinicId: string,
): Promise<ClinicNotificationContext> => {
  const clinic = await clinicsRepository.findOne({
    where: { id: clinicId },
    select: { language: true, name: true },
  });

  return {
    locale: resolveNotificationLocale(clinic?.language),
    clinicName: clinic?.name ?? '',
  };
};
