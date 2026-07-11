export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length === 13) {
    return `0${digits.slice(3)}`;
  }

  if (digits.startsWith("234") && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }

  return digits;
}
