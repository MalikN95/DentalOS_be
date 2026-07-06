export type DaySchedule = {
  from: string; // 'HH:mm'
  to: string; // 'HH:mm'
} | null;

export interface WorkingHours {
  mon: DaySchedule;
  tue: DaySchedule;
  wed: DaySchedule;
  thu: DaySchedule;
  fri: DaySchedule;
  sat: DaySchedule;
  sun: DaySchedule;
}
