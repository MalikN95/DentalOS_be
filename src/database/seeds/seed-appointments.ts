import { DataSource } from 'typeorm';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import {
  AppointmentEntity,
  AppointmentSource,
} from '../../entities/appointment.entity';
import { CabinetEntity } from '../../entities/cabinet.entity';
import { DoctorProfileEntity } from '../../entities/doctor-profile.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ServiceEntity } from '../../entities/service.entity';
import { ensureClinic } from './seed-clinic';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// How many days of history/future to generate around "today".
const DAYS_BEFORE_TODAY = 14;
const DAYS_AFTER_TODAY = 6;

const MIN_APPOINTMENTS_PER_DOCTOR_DAY = 3;
const MAX_APPOINTMENTS_PER_DOCTOR_DAY = 5;
const MAX_GAP_MINUTES = 30;

interface WorkWindow {
  startHour: number;
  endHour: number;
}

// Mirrors the WEEKDAY_HOURS used in seed-branches.ts (Mon-Fri 9-20, Sat 10-16, Sun closed).
const getWorkWindow = (weekday: number): WorkWindow | null => {
  if (weekday === 0) return null; // Sunday
  if (weekday === 6) return { startHour: 10, endHour: 16 }; // Saturday
  return { startHour: 9, endHour: 20 };
};

// Used only when "today" itself falls on a Sunday, so the seed never leaves
// the appointments screen empty just because of which day it happened to run.
const SUNDAY_TODAY_FALLBACK_WINDOW: WorkWindow = { startHour: 10, endHour: 16 };

const randomInt = (min: number, max: number): number =>
  min + Math.floor(Math.random() * (max - min + 1));

const pickOne = <T>(items: T[]): T => items[randomInt(0, items.length - 1)];

const pickWeighted = <T>(options: [T, number][]): T => {
  const total = options.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;

  for (const [value, weight] of options) {
    roll -= weight;
    if (roll <= 0) return value;
  }

  return options[options.length - 1][0];
};

const pickPastStatus = (): AppointmentStatus =>
  pickWeighted([
    [AppointmentStatus.COMPLETED, 0.75],
    [AppointmentStatus.NO_SHOW, 0.13],
    [AppointmentStatus.CANCELLED, 0.12],
  ]);

const pickStatus = (
  startsAt: Date,
  endsAt: Date,
  isPastDay: boolean,
  isFutureDay: boolean,
  now: Date,
): AppointmentStatus => {
  if (isPastDay) return pickPastStatus();
  if (isFutureDay) {
    return pickWeighted([
      [AppointmentStatus.PENDING, 0.35],
      [AppointmentStatus.CONFIRMED, 0.65],
    ]);
  }

  // Today: branch on whether the slot is already over, ongoing, or upcoming.
  if (endsAt <= now) return pickPastStatus();
  if (startsAt <= now && now < endsAt) {
    return pickWeighted([
      [AppointmentStatus.IN_TREATMENT, 0.6],
      [AppointmentStatus.ARRIVED, 0.4],
    ]);
  }

  return pickWeighted([
    [AppointmentStatus.PENDING, 0.4],
    [AppointmentStatus.CONFIRMED, 0.6],
  ]);
};

/**
 * Generates a spread of appointments across ~3 weeks (past + today + near
 * future) for every active, branch-assigned doctor, using random patients,
 * services and cabinets. Skipped entirely if the clinic already has any
 * appointments (coarse idempotency — re-run after deleting rows to regenerate
 * a fresh "today").
 */
export const seedAppointments = async (
  dataSource: DataSource,
): Promise<void> => {
  const clinic = await ensureClinic(dataSource);
  const appointmentRepository = dataSource.getRepository(AppointmentEntity);

  const existingCount = await appointmentRepository.count({
    where: { clinicId: clinic.id },
  });

  if (existingCount > 0) {
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(
      `Clinic already has ${existingCount} appointments, skipping seed-appointments`,
    );
    return;
  }

  const doctorRepository = dataSource.getRepository(DoctorProfileEntity);
  const patientRepository = dataSource.getRepository(PatientEntity);
  const serviceRepository = dataSource.getRepository(ServiceEntity);
  const cabinetRepository = dataSource.getRepository(CabinetEntity);

  const doctors = (
    await doctorRepository.find({
      where: { clinicId: clinic.id, isActive: true },
    })
  ).filter((doctor) => doctor.branchId !== null);
  const patients = await patientRepository.find({
    where: { clinicId: clinic.id, isActive: true },
  });
  const services = await serviceRepository.find({
    where: { clinicId: clinic.id, isActive: true },
  });
  const cabinets = await cabinetRepository.find({ where: { isActive: true } });

  if (doctors.length === 0 || patients.length === 0 || services.length === 0) {
    // eslint-disable-next-line no-console -- seed CLI output
    console.log(
      'Missing doctors, patients or services — run seedStaff/seedRandomPatients/seedServices first',
    );
    return;
  }

  const cabinetsByBranch = new Map<string, CabinetEntity[]>();
  for (const cabinet of cabinets) {
    const list = cabinetsByBranch.get(cabinet.branchId) ?? [];
    list.push(cabinet);
    cabinetsByBranch.set(cabinet.branchId, list);
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const appointments: AppointmentEntity[] = [];

  for (
    let dayOffset = -DAYS_BEFORE_TODAY;
    dayOffset <= DAYS_AFTER_TODAY;
    dayOffset += 1
  ) {
    const day = new Date(today.getTime() + dayOffset * MS_PER_DAY);
    // "Today" always gets appointments, even on a day the clinic is normally
    // closed — otherwise the seed would produce an empty screen whenever it's
    // run on a Sunday.
    const window =
      getWorkWindow(day.getDay()) ??
      (dayOffset === 0 ? SUNDAY_TODAY_FALLBACK_WINDOW : null);
    if (!window) continue; // closed that day

    const isPastDay = dayOffset < 0;
    const isFutureDay = dayOffset > 0;

    for (const doctor of doctors) {
      const { branchId } = doctor;
      if (!branchId) continue;

      const branchCabinets = cabinetsByBranch.get(branchId) ?? [];
      let cursorMinutes = window.startHour * 60;
      const endMinutes = window.endHour * 60;
      const appointmentsToday = randomInt(
        MIN_APPOINTMENTS_PER_DOCTOR_DAY,
        MAX_APPOINTMENTS_PER_DOCTOR_DAY,
      );

      for (let i = 0; i < appointmentsToday; i += 1) {
        const service = pickOne(services);
        const startsAt = new Date(
          day.getTime() + cursorMinutes * MS_PER_MINUTE,
        );
        const endsAt = new Date(
          startsAt.getTime() + service.durationMinutes * MS_PER_MINUTE,
        );

        if (cursorMinutes + service.durationMinutes > endMinutes) break;

        cursorMinutes +=
          service.durationMinutes + randomInt(0, MAX_GAP_MINUTES);

        const patient = pickOne(patients);
        const cabinet =
          branchCabinets.length > 0 && Math.random() > 0.1
            ? pickOne(branchCabinets)
            : null;
        const status = pickStatus(
          startsAt,
          endsAt,
          isPastDay,
          isFutureDay,
          now,
        );
        const source = pickWeighted<AppointmentSource>([
          [AppointmentSource.RECEPTION, 0.85],
          [AppointmentSource.ONLINE, 0.15],
        ]);

        const appointment = appointmentRepository.create({
          clinicId: clinic.id,
          branchId,
          doctorProfileId: doctor.id,
          patientId: patient.id,
          serviceId: service.id,
          cabinetId: cabinet?.id ?? null,
          startsAt,
          endsAt,
          status,
          source,
          price: service.price,
          comment: null,
          cancellationReason:
            status === AppointmentStatus.CANCELLED
              ? 'Перенос по инициативе пациента'
              : null,
        });

        appointments.push(appointment);
      }
    }
  }

  await appointmentRepository.save(appointments);
  // eslint-disable-next-line no-console -- seed CLI output
  console.log(`Created ${appointments.length} appointments`);
};
