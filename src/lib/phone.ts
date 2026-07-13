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

/** Format a stored phone number for Nigeria Bulk SMS (234XXXXXXXXXX). */
export function formatPhoneForSmsApi(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");

  if (digits.startsWith("234") && digits.length >= 12 && digits.length <= 13) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }

  if (digits.length === 10) {
    return `234${digits}`;
  }

  return null;
}
