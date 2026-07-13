export const CONTRIBUTION_AMOUNT = 5000;
export const PAYOUT_AMOUNT = 10000;
export const CURRENCY = "₦";
export const PAYMENT_CONFIRMATION_TIMEOUT_MS = 24 * 60 * 60 * 1000;
/** How long before the system retries matching a user to an upline */
export const MERGE_RETRY_INTERVAL_MS = 10 * 1000;
export const REMATCH_WAIT_TIMEOUT_MS = MERGE_RETRY_INTERVAL_MS;
export const ADMIN_CONTACT_EMAIL =
  process.env.ADMIN_CONTACT_EMAIL || "admin@wealthcircle.info";
export const ADMIN_CONTACT_PHONE =
  process.env.ADMIN_CONTACT_PHONE || "08000000000";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.SITE_URL ||
  "https://www.wealthcircle.info";
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000;
export const REFERRAL_REWARD_AMOUNT = 1000;
export const REFERRAL_WITHDRAWAL_THRESHOLD = 5000;
