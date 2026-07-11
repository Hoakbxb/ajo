export const CONTRIBUTION_AMOUNT = 5000;
export const PAYOUT_AMOUNT = 10000;
export const CURRENCY = "₦";
export const PAYMENT_CONFIRMATION_TIMEOUT_MS = 30 * 60 * 1000;
/** How long before the system retries matching a user to an upline */
export const MERGE_RETRY_INTERVAL_MS = 10 * 1000;
export const REMATCH_WAIT_TIMEOUT_MS = MERGE_RETRY_INTERVAL_MS;
export const ADMIN_CONTACT_EMAIL =
  process.env.ADMIN_CONTACT_EMAIL || "admin@friendsrewardcircle.com";
export const ADMIN_CONTACT_PHONE =
  process.env.ADMIN_CONTACT_PHONE || "08000000000";
