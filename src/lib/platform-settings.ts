import {
  CONTRIBUTION_AMOUNT as DEFAULT_CONTRIBUTION_AMOUNT,
  PAYOUT_AMOUNT as DEFAULT_PAYOUT_AMOUNT,
} from "@/lib/constants";
import {
  getPlatformSettingsRow,
  updatePlatformSettingsRow,
} from "@/lib/db/repository";
import type { PlatformSettings } from "@/types/database";

let cache: PlatformSettings | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 30_000;

export async function getPlatformSettings(): Promise<PlatformSettings> {
  if (cache && Date.now() < cacheExpiresAt) return cache;

  const row = await getPlatformSettingsRow();
  const settings: PlatformSettings = {
    contributionAmount: row?.contributionAmount ?? DEFAULT_CONTRIBUTION_AMOUNT,
    payoutAmount: row?.payoutAmount ?? DEFAULT_PAYOUT_AMOUNT,
    updatedBy: row?.updatedBy ?? null,
    updatedAt: row?.updatedAt ?? new Date(),
  };

  cache = settings;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return settings;
}

export async function getContributionAmount(): Promise<number> {
  return (await getPlatformSettings()).contributionAmount;
}

export async function getPayoutAmount(): Promise<number> {
  return (await getPlatformSettings()).payoutAmount;
}

export async function updatePlatformSettings(
  adminMemberId: string,
  patch: { contributionAmount?: number; payoutAmount?: number }
): Promise<PlatformSettings> {
  if (
    patch.contributionAmount !== undefined &&
    patch.contributionAmount <= 0
  ) {
    throw new Error("Contribution amount must be greater than zero");
  }
  if (patch.payoutAmount !== undefined && patch.payoutAmount <= 0) {
    throw new Error("Payout amount must be greater than zero");
  }

  const updated = await updatePlatformSettingsRow({
    ...patch,
    updatedBy: adminMemberId,
  });

  cache = updated;
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return updated;
}

export function invalidatePlatformSettingsCache() {
  cache = null;
  cacheExpiresAt = 0;
}
