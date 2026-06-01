const swissDateTimeFormat = new Intl.DateTimeFormat("de-CH", {
  dateStyle: "short",
  timeStyle: "short"
});

const swissTimeFormat = new Intl.DateTimeFormat("de-CH", {
  hour: "2-digit",
  minute: "2-digit"
});

export function formatDateTime(value?: string): string {
  if (!value) {
    return "Unbekannt";
  }

  return swissDateTimeFormat.format(new Date(value));
}

export function formatTime(value?: string | Date): string {
  if (!value) {
    return "Unbekannt";
  }

  const date = value instanceof Date ? value : new Date(value);
  return swissTimeFormat.format(date);
}
