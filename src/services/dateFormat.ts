export function formatDateTime(value?: string): string {
  if (!value) {
    return "Unbekannt";
  }

  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
