/** Format a Date for <input type="datetime-local"> in server local time. */
export function toLocalInput(d: Date | null | undefined) {
  if (!d) return null;
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 16);
}
