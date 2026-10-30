// Edad mínima para crear cuenta. La fecha llega como AAAA-MM-DD y se interpreta
// como fecha civil: sin horas ni zona horaria, para que el cumpleaños no cambie
// según el servidor.
export const MIN_AGE = 16;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseBirthDate(value) {
  if (typeof value !== "string") return null;
  const match = DATE_RE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

// Edad cumplida hoy, en UTC para no depender de la zona del proceso.
export function ageFromBirthDate(value, now = new Date()) {
  const birth = parseBirthDate(value);
  if (!birth) return null;
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < birth.getUTCDate())) age -= 1;
  return age >= 0 ? age : null;
}
