import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Contribution, MemberRole } from "@/types/database";

export const PAYMENT_PROOF_BUCKET = "payment-proofs";
export const MAX_PAYMENT_PROOF_BYTES = 5 * 1024 * 1024;
export const ALLOWED_PAYMENT_PROOF_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function extensionForMime(mime: string): string | null {
  return MIME_TO_EXT[mime] ?? null;
}

export function paymentProofStoragePath(
  contributionId: string,
  mime: string
): string {
  const ext = extensionForMime(mime);
  if (!ext) throw new Error("Unsupported image type");
  return `${contributionId}/proof.${ext}`;
}

export function canViewPaymentProof(
  contribution: Pick<Contribution, "fromMemberId" | "toMemberId">,
  memberId: string,
  role: MemberRole
) {
  return (
    role === "admin" ||
    contribution.fromMemberId === memberId ||
    contribution.toMemberId === memberId
  );
}

export function canManagePaymentProof(
  contribution: Pick<Contribution, "fromMemberId" | "status">,
  memberId: string,
  role: MemberRole
) {
  if (role === "admin") return true;
  return (
    contribution.fromMemberId === memberId &&
    (contribution.status === "pending" ||
      contribution.status === "awaiting_confirmation")
  );
}

export function validatePaymentProofFile(file: {
  type: string;
  size: number;
}) {
  if (!ALLOWED_PAYMENT_PROOF_TYPES.has(file.type)) {
    throw new Error("Upload a JPEG, PNG, WebP, or GIF image");
  }
  if (file.size > MAX_PAYMENT_PROOF_BYTES) {
    throw new Error("Screenshot must be 5 MB or smaller");
  }
}

export async function uploadPaymentProof(
  storagePath: string,
  body: Buffer | ArrayBuffer,
  contentType: string
) {
  const { error } = await getSupabaseAdmin()
    .storage.from(PAYMENT_PROOF_BUCKET)
    .upload(storagePath, body, {
      upsert: true,
      contentType,
      cacheControl: "3600",
    });

  if (error) throw new Error(error.message);
}

export async function deletePaymentProofFile(storagePath: string) {
  const { error } = await getSupabaseAdmin()
    .storage.from(PAYMENT_PROOF_BUCKET)
    .remove([storagePath]);

  if (error) throw new Error(error.message);
}

export async function getPaymentProofSignedUrl(
  storagePath: string,
  expiresIn = 3600
) {
  const { data, error } = await getSupabaseAdmin()
    .storage.from(PAYMENT_PROOF_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function enrichContributionsWithProofUrls<
  T extends {
    paymentProofPath?: string | null;
    paymentProofUploadedAt?: Date | string | null;
  },
>(contributions: T[]) {
  return Promise.all(
    contributions.map(async (contribution) => {
      if (!contribution.paymentProofPath) {
        return { ...contribution, paymentProofUrl: null as string | null };
      }

      try {
        const paymentProofUrl = await getPaymentProofSignedUrl(
          contribution.paymentProofPath
        );
        return { ...contribution, paymentProofUrl };
      } catch {
        return { ...contribution, paymentProofUrl: null as string | null };
      }
    })
  );
}
