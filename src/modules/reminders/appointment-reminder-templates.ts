export interface AppointmentReminderTemplate {
  name: string;
  languageCode: string;
}

// Keyed by the reminder's offset from the appointment, in minutes — must line
// up with a ReminderSettingEntity.offsetMinutes value the clinic has enabled
// (120 = 2h before, 1440 = 1 day before). Offsets with no entry here fall
// back to free-form text (ReminderProcessorService), which Meta only
// delivers inside the 24h customer-service window.
//
// `languageCode` must match the language each template shows on its detail
// page in Meta (Business Manager > Account tools > Message templates) — not
// the language of the template's body text. Verify it there before relying
// on the defaults below.
export const APPOINTMENT_REMINDER_TEMPLATES: Readonly<
  Record<number, AppointmentReminderTemplate>
> = {
  120: { name: 'appointment_notification_hours_ru', languageCode: 'en' },
  1440: { name: 'appointment_notificatin_dey', languageCode: 'en' },
};
