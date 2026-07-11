import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { findContributionById, updateContribution } from "@/lib/db/repository";
import {
  canManagePaymentProof,
  canViewPaymentProof,
  deletePaymentProofFile,
  getPaymentProofSignedUrl,
  paymentProofStoragePath,
  uploadPaymentProof,
  validatePaymentProofFile,
} from "@/lib/payment-proof";

async function loadAuthorizedContribution(
  contributionId: string,
  mode: "view" | "manage"
) {
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const contribution = await findContributionById(contributionId);
  if (!contribution) {
    return {
      error: NextResponse.json({ error: "Contribution not found" }, { status: 404 }),
    };
  }

  const allowed =
    mode === "manage"
      ? canManagePaymentProof(contribution, session.memberId, session.role)
      : canViewPaymentProof(contribution, session.memberId, session.role);

  if (!allowed) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session, contribution };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await loadAuthorizedContribution(id, "view");
    if ("error" in result && result.error) return result.error;

    const { contribution } = result;
    if (!contribution?.paymentProofPath) {
      return NextResponse.json({ proof: null });
    }

    const url = await getPaymentProofSignedUrl(contribution.paymentProofPath);

    return NextResponse.json({
      proof: {
        path: contribution.paymentProofPath,
        url,
        uploadedAt: contribution.paymentProofUploadedAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load payment proof";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await loadAuthorizedContribution(id, "manage");
    if ("error" in result && result.error) return result.error;

    const { contribution } = result;
    if (!contribution) {
      return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Screenshot file is required" }, { status: 400 });
    }

    validatePaymentProofFile({ type: file.type, size: file.size });

    const storagePath = paymentProofStoragePath(contribution.id, file.type);
    const buffer = Buffer.from(await file.arrayBuffer());

    if (contribution.paymentProofPath && contribution.paymentProofPath !== storagePath) {
      try {
        await deletePaymentProofFile(contribution.paymentProofPath);
      } catch {
        // Best-effort cleanup of the previous file.
      }
    }

    await uploadPaymentProof(storagePath, buffer, file.type);

    const updated = await updateContribution(contribution.id, {
      paymentProofPath: storagePath,
      paymentProofUploadedAt: new Date(),
    });

    const url = await getPaymentProofSignedUrl(storagePath);

    return NextResponse.json({
      message: "Payment screenshot uploaded",
      proof: {
        path: updated.paymentProofPath,
        url,
        uploadedAt: updated.paymentProofUploadedAt,
      },
      contribution: updated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload payment proof";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await loadAuthorizedContribution(id, "manage");
    if ("error" in result && result.error) return result.error;

    const { contribution } = result;
    if (!contribution?.paymentProofPath) {
      return NextResponse.json({ message: "No payment proof to delete" });
    }

    await deletePaymentProofFile(contribution.paymentProofPath);
    const updated = await updateContribution(contribution.id, {
      paymentProofPath: null,
      paymentProofUploadedAt: null,
    });

    return NextResponse.json({
      message: "Payment screenshot removed",
      contribution: updated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete payment proof";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
