/** Stable contribution id for URLs and API calls (_id from DB, id as fallback). */
export function getContributionId(
  contribution: { _id?: string | null; id?: string | null } | null | undefined
): string {
  const value = contribution?._id ?? contribution?.id ?? "";
  return typeof value === "string" ? value.trim() : "";
}

export function withContributionId<T extends { _id?: string | null; id?: string | null }>(
  contribution: T
): T & { _id: string; id: string } {
  const resolved = getContributionId(contribution);
  return {
    ...contribution,
    _id: resolved,
    id: resolved,
  };
}
