const ensureDateAtMidnight = (date: Date): Date => {
  const clone = new Date(date.getTime());
  clone.setHours(0, 0, 0, 0);
  return clone;
};

export const todayLocalDate = (): Date => ensureDateAtMidnight(new Date());

export const parseLocalDate = (value: string): Date => {
  if (!value) {
    return todayLocalDate();
  }

  const normalized = value.trim();
  const [yearStr, monthStr, dayStr] = normalized.split("-");

  if (!yearStr || !monthStr || !dayStr) {
    return todayLocalDate();
  }

  const year = Number.parseInt(yearStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const day = Number.parseInt(dayStr, 10);

  if (![year, month, day].every((part) => Number.isFinite(part))) {
    return todayLocalDate();
  }

  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) {
    return todayLocalDate();
  }

  return ensureDateAtMidnight(parsed);
};

export const formatDateToISO = (date: Date): string => {
  const safeDate = ensureDateAtMidnight(date);
  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
