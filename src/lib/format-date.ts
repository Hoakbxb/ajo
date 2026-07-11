const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
};

const DATE_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
};

/** Fixed-locale formatting to avoid SSR/client hydration mismatches. */
export function formatDisplayDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", DATE_FORMAT).format(date);
}

export function formatDisplayDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-GB", DATE_TIME_FORMAT).format(date);
}
