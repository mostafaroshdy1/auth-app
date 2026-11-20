const MS_PER_SECOND = 1000;
const MS_PER_DAY = 24 * 60 * 60 * MS_PER_SECOND;

export const secondsFromNow = (seconds: number) =>
  new Date(Date.now() + seconds * MS_PER_SECOND);

export const daysFromNow = (days: number) =>
  new Date(Date.now() + days * MS_PER_DAY);

export const secondsUntil = (date: Date) =>
  Math.floor((date.getTime() - Date.now()) / MS_PER_SECOND);
