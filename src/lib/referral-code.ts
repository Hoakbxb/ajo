/** Cookie set when someone opens a referral invite link. */
export const REFERRAL_COOKIE = "wc_referral_code";

export function normalizeReferralCode(
  value: string | undefined | null
): string {
  return (value ?? "").trim().toUpperCase();
}
