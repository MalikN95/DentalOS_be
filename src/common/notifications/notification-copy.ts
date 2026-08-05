import { NotificationLocale } from './notification-locale';

export interface NotificationCopy {
  subject: string;
  body: string;
}

interface BookingCreatedParams {
  clinicName: string;
  date: string;
  time: string;
  serviceName: string;
  doctorName: string;
  address: string;
  preparation?: string | null;
}

// Sent the moment an online booking is created — the appointment is still
// `pending` at this point (staff confirm it later, which fires
// appointmentConfirmedPatientCopy instead), so this deliberately says
// "received", not "confirmed".
export const bookingCreatedCopy = (
  locale: NotificationLocale,
  p: BookingCreatedParams,
): NotificationCopy => {
  if (locale === 'en') {
    const lines = [
      `${p.clinicName}: we've received your appointment request.`,
      `Date: ${p.date} ${p.time}`,
      `Service: ${p.serviceName}`,
      `Doctor: ${p.doctorName}`,
      `Address: ${p.address}`,
    ];
    if (p.preparation) lines.push(`Preparation: ${p.preparation}`);
    return {
      subject: `Booking received — ${p.clinicName}`,
      body: lines.join('\n'),
    };
  }

  if (locale === 'ky') {
    const lines = [
      `${p.clinicName}: жазылуу сурооңуз кабыл алынды.`,
      `Күнү: ${p.date} ${p.time}`,
      `Кызмат: ${p.serviceName}`,
      `Дарыгер: ${p.doctorName}`,
      `Дареги: ${p.address}`,
    ];
    if (p.preparation) lines.push(`Даярдануу: ${p.preparation}`);
    return {
      subject: `Жазылуу кабыл алынды — ${p.clinicName}`,
      body: lines.join('\n'),
    };
  }

  const lines = [
    `${p.clinicName}: ваша запись создана и ожидает подтверждения клиникой.`,
    `Дата: ${p.date} ${p.time}`,
    `Услуга: ${p.serviceName}`,
    `Врач: ${p.doctorName}`,
    `Адрес: ${p.address}`,
  ];
  if (p.preparation) lines.push(`Подготовка: ${p.preparation}`);
  return {
    subject: `Запись создана — ${p.clinicName}`,
    body: lines.join('\n'),
  };
};

interface NewBookingParams {
  patientName: string;
  doctorName: string;
  serviceName: string;
  date: string;
  time: string;
}

export const newBookingDoctorCopy = (
  locale: NotificationLocale,
  p: Omit<NewBookingParams, 'doctorName'>,
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'New online booking',
      body: `${p.patientName} booked "${p.serviceName}" on ${p.date} at ${p.time}.`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Жаңы онлайн жазылуу',
      body: `${p.patientName} «${p.serviceName}» кызматына ${p.date} күнү, саат ${p.time} жазылды.`,
    };
  }
  return {
    subject: 'Новая онлайн-запись',
    body: `${p.patientName} записался(-ась) на «${p.serviceName}» ${p.date} в ${p.time}.`,
  };
};

export const newBookingAdminCopy = (
  locale: NotificationLocale,
  p: NewBookingParams,
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'New online booking',
      body: `${p.patientName} booked with ${p.doctorName} for "${p.serviceName}" on ${p.date} at ${p.time}.`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Жаңы онлайн жазылуу',
      body: `${p.patientName} ${p.doctorName} дарыгерине «${p.serviceName}» кызматына ${p.date} күнү, саат ${p.time} жазылды.`,
    };
  }
  return {
    subject: 'Новая онлайн-запись',
    body: `${p.patientName} записался(-ась) к ${p.doctorName} на «${p.serviceName}» ${p.date} в ${p.time}.`,
  };
};

export const appointmentArrivedCopy = (
  locale: NotificationLocale,
  p: { patientName: string; serviceName: string; when: string },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Patient arrived',
      body: `${p.patientName} has arrived for their appointment (${p.serviceName}, ${p.when}).`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Бейтап келди',
      body: `${p.patientName} кабылдоого келди (${p.serviceName}, ${p.when}).`,
    };
  }
  return {
    subject: 'Пациент пришёл',
    body: `${p.patientName} пришёл(-ла) на приём (${p.serviceName}, ${p.when}).`,
  };
};

export const appointmentConfirmedPatientCopy = (
  locale: NotificationLocale,
  p: { serviceName: string; when: string },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Appointment confirmed',
      body: `Your appointment on ${p.when} (${p.serviceName}) has been confirmed.`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Кабылдоо ырасталды',
      body: `Сиздин ${p.when} убактысындагы кабылдооңуз (${p.serviceName}) ырасталды.`,
    };
  }
  return {
    subject: 'Приём подтверждён',
    body: `Ваш приём ${p.when} (${p.serviceName}) подтверждён.`,
  };
};

export const appointmentCancelledPatientCopy = (
  locale: NotificationLocale,
  p: { serviceName: string; when: string },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Appointment cancelled',
      body: `Your appointment on ${p.when} (${p.serviceName}) has been cancelled.`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Кабылдоо жокко чыгарылды',
      body: `Сиздин ${p.when} убактысындагы кабылдооңуз (${p.serviceName}) жокко чыгарылды.`,
    };
  }
  return {
    subject: 'Приём отменён',
    body: `Ваш приём ${p.when} (${p.serviceName}) отменён.`,
  };
};

export const appointmentCancelledDoctorCopy = (
  locale: NotificationLocale,
  p: { patientName: string; serviceName: string; when: string },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Appointment cancelled',
      body: `The appointment with ${p.patientName} on ${p.when} (${p.serviceName}) has been cancelled.`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Кабылдоо жокко чыгарылды',
      body: `${p.patientName} менен ${p.when} убактысындагы кабылдоо (${p.serviceName}) жокко чыгарылды.`,
    };
  }
  return {
    subject: 'Приём отменён',
    body: `Приём с ${p.patientName} ${p.when} (${p.serviceName}) отменён.`,
  };
};

export const appointmentCancelledAdminCopy = (
  locale: NotificationLocale,
  p: {
    patientName: string;
    doctorName: string;
    serviceName: string;
    when: string;
  },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Booking cancelled',
      body: `Cancelled booking: ${p.patientName} with ${p.doctorName}, ${p.when} (${p.serviceName}).`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Жазылуу жокко чыгарылды',
      body: `Жокко чыгарылды: ${p.patientName} — ${p.doctorName} дарыгерге, ${p.when} (${p.serviceName}).`,
    };
  }
  return {
    subject: 'Запись отменена',
    body: `Отменена запись: ${p.patientName} к ${p.doctorName}, ${p.when} (${p.serviceName}).`,
  };
};

export const appointmentRescheduledPatientCopy = (
  locale: NotificationLocale,
  p: { serviceName: string; previousWhen: string; nextWhen: string },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Appointment time changed',
      body: `Your appointment time (${p.serviceName}) has been moved: ${p.previousWhen} → ${p.nextWhen}.`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Кабылдоо убактысы өзгөрдү',
      body: `Сиздин кабылдооңуздун убактысы (${p.serviceName}) которулду: ${p.previousWhen} → ${p.nextWhen}.`,
    };
  }
  return {
    subject: 'Время приёма изменено',
    body: `Время вашего приёма (${p.serviceName}) перенесено: ${p.previousWhen} → ${p.nextWhen}.`,
  };
};

export const appointmentRescheduledDoctorCopy = (
  locale: NotificationLocale,
  p: {
    patientName: string;
    serviceName: string;
    previousWhen: string;
    nextWhen: string;
  },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Appointment time changed',
      body: `The appointment with ${p.patientName} (${p.serviceName}) has been moved: ${p.previousWhen} → ${p.nextWhen}.`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Кабылдоо убактысы өзгөрдү',
      body: `${p.patientName} менен болгон кабылдоо (${p.serviceName}) которулду: ${p.previousWhen} → ${p.nextWhen}.`,
    };
  }
  return {
    subject: 'Время приёма изменено',
    body: `Приём с ${p.patientName} (${p.serviceName}) перенесён: ${p.previousWhen} → ${p.nextWhen}.`,
  };
};

export const invoiceIssuedCopy = (
  locale: NotificationLocale,
  p: { invoiceNumber: string; total: string },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Invoice issued',
      body: `You've been issued invoice #${p.invoiceNumber} for ${p.total}.`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Эсеп-фактура берилди',
      body: `Сизге №${p.invoiceNumber} эсеп-фактурасы берилди, суммасы ${p.total}.`,
    };
  }
  return {
    subject: 'Выставлен счёт',
    body: `Вам выставлен счёт №${p.invoiceNumber} на сумму ${p.total}.`,
  };
};

export const paymentReceivedCopy = (
  locale: NotificationLocale,
  p: { invoiceNumber: string; isFullyPaid: boolean },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Payment received',
      body: p.isFullyPaid
        ? `Invoice #${p.invoiceNumber} has been paid in full. Thank you!`
        : `A partial payment for invoice #${p.invoiceNumber} has been received.`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Төлөм кабыл алынды',
      body: p.isFullyPaid
        ? `№${p.invoiceNumber} эсеп-фактурасы боюнча толук төлөм кабыл алынды. Рахмат!`
        : `№${p.invoiceNumber} эсеп-фактурасы боюнча жарым-жартылай төлөм кабыл алынды.`,
    };
  }
  return {
    subject: 'Оплата получена',
    body: p.isFullyPaid
      ? `Оплата по счёту №${p.invoiceNumber} получена в полном объёме. Спасибо!`
      : `Получена частичная оплата по счёту №${p.invoiceNumber}.`,
  };
};

export const reviewRequestCopy = (
  locale: NotificationLocale,
  p: { token: string },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Rate your appointment',
      body: `Please rate your appointment. Your review code: ${p.token}`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Кабылдооңузга баа бериңиз',
      body: `Сураныч, кабылдооңузга баа бериңиз. Пикир коду: ${p.token}`,
    };
  }
  return {
    subject: 'Оцените ваш приём',
    body: `Пожалуйста, оцените ваш приём. Код для отзыва: ${p.token}`,
  };
};

export const emailChangeOtpCopy = (
  locale: NotificationLocale,
  p: { code: string },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Confirm your new email',
      body: `Your confirmation code is: ${p.code}. It expires in 5 minutes. If you didn't request this, ignore this email.`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: "Жаңы email'иңизди ырастаңыз",
      body: `Ырастоо коду: ${p.code}. Код 5 мүнөттөн кийин жарактан чыгат. Эгер сиз бул сурам жасабасаңыз, каттты этибарга албаңыз.`,
    };
  }
  return {
    subject: 'Подтверждение нового email',
    body: `Код подтверждения: ${p.code}. Код действителен 5 минут. Если вы не запрашивали это, проигнорируйте письмо.`,
  };
};

interface NewReviewParams {
  patientName: string;
  doctorName?: string | null;
  stars: string;
  comment?: string | null;
}

export const newReviewDoctorCopy = (
  locale: NotificationLocale,
  p: Omit<NewReviewParams, 'doctorName'>,
): NotificationCopy => {
  if (locale === 'en') {
    const commentSuffix = p.comment ? `: "${p.comment}"` : '.';
    return {
      subject: 'New review',
      body: `${p.patientName} left a review ${p.stars}${commentSuffix}`,
    };
  }
  if (locale === 'ky') {
    const commentSuffix = p.comment ? `: «${p.comment}»` : '.';
    return {
      subject: 'Жаңы пикир',
      body: `${p.patientName} пикир калтырды ${p.stars}${commentSuffix}`,
    };
  }
  const commentSuffix = p.comment ? `: «${p.comment}»` : '.';
  return {
    subject: 'Новый отзыв',
    body: `${p.patientName} оставил(-а) отзыв ${p.stars}${commentSuffix}`,
  };
};

export const newReviewAdminCopy = (
  locale: NotificationLocale,
  p: NewReviewParams,
): NotificationCopy => {
  if (locale === 'en') {
    const commentSuffix = p.comment ? `: "${p.comment}"` : '.';
    const doctorSuffix = p.doctorName ? ` about Dr. ${p.doctorName}` : '';
    return {
      subject: 'New review',
      body: `${p.patientName}${doctorSuffix} left a review ${p.stars}${commentSuffix}`,
    };
  }
  if (locale === 'ky') {
    const commentSuffix = p.comment ? `: «${p.comment}»` : '.';
    const doctorSuffix = p.doctorName ? ` ${p.doctorName} дарыгер жөнүндө` : '';
    return {
      subject: 'Жаңы пикир',
      body: `${p.patientName}${doctorSuffix} пикир калтырды ${p.stars}${commentSuffix}`,
    };
  }
  const commentSuffix = p.comment ? `: «${p.comment}»` : '.';
  const doctorSuffix = p.doctorName ? ` о враче ${p.doctorName}` : '';
  return {
    subject: 'Новый отзыв',
    body: `${p.patientName}${doctorSuffix} оставил(-а) отзыв ${p.stars}${commentSuffix}`,
  };
};

export type LastOwnerActionKind = 'update' | 'remove';

export const lastOwnerAlertCopy = (
  locale: NotificationLocale,
  p: { actionKind: LastOwnerActionKind; ownerName: string },
): NotificationCopy => {
  if (locale === 'en') {
    const actionPhrase =
      p.actionKind === 'update'
        ? `change the role of or deactivate the owner ${p.ownerName}`
        : `delete the owner ${p.ownerName}`;
    return {
      subject: 'Attempt to remove the last owner',
      body: `Someone attempted to ${actionPhrase} — the clinic would have been left without an active owner. The action was blocked.`,
    };
  }
  if (locale === 'ky') {
    const actionPhrase =
      p.actionKind === 'update'
        ? `${p.ownerName} ээсинин ролун өзгөртүүгө же аны өчүрүүгө`
        : `${p.ownerName} ээсин өчүрүүгө`;
    return {
      subject: 'Акыркы ээни өчүрүү аракети',
      body: `Кимдир бирөө ${actionPhrase} аракет кылды — клиника активдүү ээсиз калмак. Аракет бөгөттөлдү.`,
    };
  }
  const actionPhrase =
    p.actionKind === 'update'
      ? `изменить роль или деактивировать владельца ${p.ownerName}`
      : `удалить владельца ${p.ownerName}`;
  return {
    subject: 'Попытка удалить последнего владельца',
    body: `Кто-то попытался ${actionPhrase} — клиника осталась бы без активного владельца. Действие заблокировано.`,
  };
};

export const appointmentReminderCopy = (
  locale: NotificationLocale,
  p: { when: string; serviceName: string; doctorName: string },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'Appointment reminder',
      body: `Reminder: appointment on ${p.when}, service ${p.serviceName}, doctor ${p.doctorName}`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Кабылдоо жөнүндө эскертүү',
      body: `Эскертүү: кабылдоо ${p.when}, кызмат ${p.serviceName}, дарыгер ${p.doctorName}`,
    };
  }
  return {
    subject: 'Напоминание о приёме',
    body: `Напоминание о приёме ${p.when}, услуга ${p.serviceName}, врач ${p.doctorName}`,
  };
};

export const newPatientPortalMessageCopy = (
  locale: NotificationLocale,
  p: { patientName: string; preview: string },
): NotificationCopy => {
  if (locale === 'en') {
    return {
      subject: 'New patient message',
      body: `${p.patientName} sent a message via the patient portal: "${p.preview}"`,
    };
  }
  if (locale === 'ky') {
    return {
      subject: 'Жаңы билдирүү',
      body: `${p.patientName} бейтап кабинети аркылуу билдирүү жөнөттү: «${p.preview}»`,
    };
  }
  return {
    subject: 'Новое сообщение от пациента',
    body: `${p.patientName} написал(-а) через личный кабинет: «${p.preview}»`,
  };
};
