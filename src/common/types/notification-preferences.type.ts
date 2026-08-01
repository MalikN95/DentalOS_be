// Which channels a patient consents to for appointment reminders and review requests.
// `push` is only meaningful once they've registered a device token from the booking
// widget (same browser session) — see PatientEntity.fcmTokens.
export interface PatientNotificationPreferences {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
}

export const DEFAULT_PATIENT_NOTIFICATION_PREFERENCES: PatientNotificationPreferences =
  {
    email: true,
    whatsapp: true,
    push: true,
  };

// Which channels a staff member consents to for kabinet notifications (e.g. a
// new online booking assigned to them).
export interface StaffNotificationPreferences {
  email: boolean;
  whatsapp: boolean;
  push: boolean;
  inApp: boolean;
}

export const DEFAULT_STAFF_NOTIFICATION_PREFERENCES: StaffNotificationPreferences =
  {
    email: true,
    whatsapp: true,
    push: true,
    inApp: true,
  };
