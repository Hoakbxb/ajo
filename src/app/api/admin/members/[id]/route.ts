import { NextResponse } from "next/server";
import {
  findContributions,
  findMemberById,
} from "@/lib/db/repository";
import { populateMemberRef } from "@/lib/db/populate";
import { adminUnauthorizedResponse, requireAdmin } from "@/lib/auth";
import {
  adminClearEscalation,
  adminDeleteMember,
  adminDetachMember,
  adminUpdateMemberProfile,
  adminUpdateMemberRole,
  adminUpdateMemberStatus,
} from "@/lib/admin-actions";
import { getBankByCode, isValidAccountNumber } from "@/lib/nigerian-banks";
import { normalizePhone } from "@/lib/phone";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const member = await findMemberById(id);
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const [parent, outgoing, incoming] = await Promise.all([
      populateMemberRef(member.parentId, ["memberId", "fullName", "email"]),
      findContributions({ fromMemberId: member.id }),
      findContributions({ toMemberId: member.id }),
    ]);

    return NextResponse.json({
      member: {
        ...member,
        joinedAt: member.joinedAt.toISOString(),
        suspendedAt: member.suspendedAt?.toISOString() ?? null,
        parentId: parent,
      },
      contributions: {
        outgoing: outgoing.length,
        incoming: incoming.length,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    return NextResponse.json(
      { error: "Failed to fetch member" },
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

    if (body.requiresAdminContactClear) {
      const updated = await adminClearEscalation(session.memberId, id);
      return NextResponse.json({
        message: "Escalation cleared",
        member: updated,
      });
    }

    if (body.action === "detach") {
      const updated = await adminDetachMember(session.memberId, id);
      return NextResponse.json({
        message: "Member detached from matrix",
        member: updated,
      });
    }

    if (body.role === "admin" || body.role === "member") {
      const updated = await adminUpdateMemberRole(
        session.memberId,
        id,
        body.role
      );
      return NextResponse.json({
        message: "Member role updated",
        member: updated,
      });
    }

    if (body.status === "pending" || body.status === "active") {
      const updated = await adminUpdateMemberStatus(
        session.memberId,
        id,
        body.status
      );
      return NextResponse.json({
        message: "Member status updated",
        member: updated,
      });
    }

    if (
      body.fullName &&
      body.email &&
      body.phone &&
      body.bankCode &&
      body.accountNumber &&
      body.accountName
    ) {
      const bank = getBankByCode(body.bankCode.trim());
      if (!bank) {
        return NextResponse.json(
          { error: "Please select a valid Nigerian bank" },
          { status: 400 }
        );
      }

      const normalizedAccountNumber = body.accountNumber
        .trim()
        .replace(/\s/g, "");
      if (!isValidAccountNumber(normalizedAccountNumber)) {
        return NextResponse.json(
          { error: "Account number must be exactly 10 digits" },
          { status: 400 }
        );
      }

      const normalizedPhone = normalizePhone(body.phone.trim());
      if (normalizedPhone.length < 10) {
        return NextResponse.json(
          { error: "Please enter a valid phone number" },
          { status: 400 }
        );
      }

      const updated = await adminUpdateMemberProfile(session.memberId, id, {
        fullName: body.fullName,
        email: body.email,
        phone: normalizedPhone,
        bankCode: bank.code,
        bankName: bank.name,
        accountNumber: normalizedAccountNumber,
        accountName: body.accountName,
      });

      return NextResponse.json({
        message: "Member profile updated",
        member: updated,
      });
    }

    return NextResponse.json(
      { error: "No valid update fields provided" },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    const message =
      error instanceof Error ? error.message : "Failed to update member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const deleted = await adminDeleteMember(session.memberId, id);

    return NextResponse.json({
      message: `${deleted.fullName} (${deleted.memberId}) deleted`,
      deleted,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return adminUnauthorizedResponse();
    }
    const message =
      error instanceof Error ? error.message : "Failed to delete member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
