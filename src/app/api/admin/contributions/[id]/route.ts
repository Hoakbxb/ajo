import { NextResponse } from "next/server";
import { findContributionById } from "@/lib/db/repository";
import { populateContributions } from "@/lib/db/populate";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";
import {
  adminCancelContribution,
  adminChangeContributionPayee,
  adminConfirmContribution,
  adminDeclineContribution,
  adminMarkContributionClaimed,
  adminRematchContributionPayer,
  adminUpdateContributionAmount,
} from "@/lib/admin-actions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const contribution = await findContributionById(id);
    if (!contribution) {
      return NextResponse.json({ error: "Contribution not found" }, { status: 404 });
    }

    const [populated] = await populateContributions([contribution]);
    return NextResponse.json({
      contribution: {
        ...populated,
        createdAt: populated.createdAt.toISOString(),
        claimedAt: populated.claimedAt?.toISOString() ?? null,
        confirmedAt: populated.confirmedAt?.toISOString() ?? null,
        declinedAt: populated.declinedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    return NextResponse.json(
      { error: "Failed to fetch contribution" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const { action, amount } = body;

    switch (action) {
      case "confirm": {
        const contribution = await adminConfirmContribution(session.memberId, id);
        return NextResponse.json({ message: "Contribution confirmed", contribution });
      }
      case "decline": {
        const contribution = await adminDeclineContribution(session.memberId, id);
        return NextResponse.json({ message: "Contribution declined", contribution });
      }
      case "cancel": {
        const result = await adminCancelContribution(session.memberId, id);
        return NextResponse.json({ message: "Contribution cancelled", result });
      }
      case "update_amount": {
        if (amount === undefined) {
          return NextResponse.json({ error: "amount is required" }, { status: 400 });
        }
        const contribution = await adminUpdateContributionAmount(
          session.memberId,
          id,
          Number(amount)
        );
        return NextResponse.json({ message: "Amount updated", contribution });
      }
      case "mark_claimed": {
        const contribution = await adminMarkContributionClaimed(
          session.memberId,
          id
        );
        return NextResponse.json({
          message: "Marked as claimed — awaiting confirmation",
          contribution,
        });
      }
      case "rematch_payer": {
        const result = await adminRematchContributionPayer(session.memberId, id);
        return NextResponse.json({
          message: result.result?.assigned
            ? "Payer rematched to a new upline"
            : "Payer queued for rematch",
          result,
        });
      }
      case "change_payee": {
        const { payeeId, position } = body;
        if (!payeeId) {
          return NextResponse.json(
            { error: "payeeId is required" },
            { status: 400 }
          );
        }
        const result = await adminChangeContributionPayee(
          session.memberId,
          id,
          payeeId,
          position === "left" || position === "right" ? position : undefined
        );
        return NextResponse.json({
          message: `Payee changed to ${result.parent.fullName} (${result.parent.memberId})`,
          result,
        });
      }
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    const message =
      error instanceof Error ? error.message : "Failed to update contribution";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
