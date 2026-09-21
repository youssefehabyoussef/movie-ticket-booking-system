/** True for real calendar dates written as YYYY-MM-DD (rejects 2026-02-31). */
export const isValidDateString = (value: string): boolean => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

/**
 * Turns (date, startTime, endTime) written in the cinema's local time into real
 * timestamps. If the end time is earlier than the start time the show is
 * treated as ending after midnight.
 */
export const buildShowtimeWindow = (date: string, startTime: string, endTime: string, tzOffset: string) => {
  const startsAt = new Date(`${date}T${startTime}:00${tzOffset}`);
  let endsAt = new Date(`${date}T${endTime}:00${tzOffset}`);
  if (endsAt.getTime() <= startsAt.getTime()) {
    endsAt = new Date(endsAt.getTime() + 24 * 60 * 60 * 1000);
  }
  return { startsAt, endsAt };
};
