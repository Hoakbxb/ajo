"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { MemberDashboardData } from "@/types";
import { PaymentPromptModal } from "@/components/PaymentPromptModal";
import { AwaitingMergeModal } from "@/components/AwaitingMergeModal";
import { CycleCompleteModal } from "@/components/CycleCompleteModal";
import { AwaitingConfirmationModal } from "@/components/AwaitingConfirmationModal";
import { IncomingContributionModal } from "@/components/IncomingContributionModal";
import { MERGE_RETRY_INTERVAL_MS } from "@/lib/constants";
import {
  ProfileCard,
  ContributionAlert,
  IncomingPaymentAlert,
  AdminContactAlert,
  AwaitingRematchNotice,
  MatrixResetNotice,
  RematchNotice,
  YourPaymentCard,
  IncomingContributionsCard,
  RecentActivityCard,
} from "./DashboardCards";
import { DashboardHeader, DashboardStats } from "./DashboardStats";
import { useRealtimeDashboard } from "@/hooks/useRealtimeDashboard";

const INCOMING_MODAL_STATUSES = new Set(["awaiting_confirmation", "pending"]);

function getIncomingForModal(
  contributions: MemberDashboardData["contributions"]["incoming"]
) {
  return contributions.filter((c) => INCOMING_MODAL_STATUSES.has(c.status));
}

export default function DashboardContent({ memberId }: { memberId: string }) {
  const [data, setData] = useState<MemberDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [incomingModalDismissed, setIncomingModalDismissed] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeModalDismissed, setMergeModalDismissed] = useState(false);
  const [showAwaitingConfirmationModal, setShowAwaitingConfirmationModal] =
    useState(false);
  const [showCycleCompleteModal, setShowCycleCompleteModal] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const seenIncomingIdsRef = useRef<Set<string>>(new Set());
  const incomingDismissedRef = useRef(false);
  const prevCyclesRef = useRef<number | null>(null);

  const openIncomingModalIfNeeded = useCallback(
    (json: MemberDashboardData) => {
      const incomingForModal = getIncomingForModal(json.contributions.incoming);
      if (incomingForModal.length === 0) return;

      const incomingIds = incomingForModal.map((c) => c._id);
      const hasNewIncoming = incomingIds.some(
        (id) => !seenIncomingIdsRef.current.has(id)
      );

      incomingIds.forEach((id) => seenIncomingIdsRef.current.add(id));

      if (!incomingDismissedRef.current || hasNewIncoming) {
        if (hasNewIncoming) {
          incomingDismissedRef.current = false;
          setIncomingModalDismissed(false);
        }
        setShowIncomingModal(true);
      }
    },
    []
  );

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/members/${memberId}`);
    const json = await res.json();
    if (res.ok) {
      setData(json);
      openIncomingModalIfNeeded(json);

      const pending = json.contributions?.outgoing?.find(
        (c: { status: string }) => c.status === "pending"
      );
      const awaitingOutgoing = json.contributions?.outgoing?.some(
        (c: { status: string }) => c.status === "awaiting_confirmation"
      );
      const hasParent = Boolean(json.member?.parentId);
      const needsPayment =
        (json.matrixProgress?.contributionOwed ?? 0) > 0 &&
        !!pending &&
        !json.member?.requiresAdminContact;
      if (needsPayment && !modalDismissed) {
        setShowPaymentModal(true);
      }
      if (
        json.matrixProgress?.waitingForRematch &&
        !awaitingOutgoing &&
        !hasParent &&
        !mergeModalDismissed
      ) {
        setShowMergeModal(true);
      } else if (!json.matrixProgress?.waitingForRematch || hasParent) {
        setShowMergeModal(false);
      }
    }
    setLoading(false);
  }, [memberId, openIncomingModalIfNeeded, modalDismissed, mergeModalDismissed]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useRealtimeDashboard(memberId, fetchData);

  useEffect(() => {
    if (!data) return;
    const cycles = data.matrixProgress.cyclesCompleted;
    if (prevCyclesRef.current === null) {
      prevCyclesRef.current = cycles;
      return;
    }
    if (cycles > prevCyclesRef.current) {
      setShowCycleCompleteModal(true);
      prevCyclesRef.current = cycles;
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const shouldPoll =
      data.matrixProgress.waitingForRematch ||
      (data.matrixProgress.cycleJustRestarted && !data.member.parentId);
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      void fetchData();
    }, MERGE_RETRY_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [
    data?.matrixProgress.waitingForRematch,
    data?.matrixProgress.cycleJustRestarted,
    data?.member.parentId,
    fetchData,
  ]);

  const pendingContribution = data?.contributions.outgoing.find(
    (c) => c.status === "pending"
  );
  const awaitingContribution = data?.contributions.outgoing.find(
    (c) => c.status === "awaiting_confirmation"
  );
  const needsPayment =
    (data?.matrixProgress.contributionOwed ?? 0) > 0 &&
    !!pendingContribution &&
    !data?.member.requiresAdminContact;
  const incomingForModal = data
    ? getIncomingForModal(data.contributions.incoming)
    : [];
  const hasIncomingForModal = incomingForModal.length > 0;
  const hasAwaitingIncoming = data?.contributions.incoming.some(
    (c) => c.status === "awaiting_confirmation"
  );
  const hasUnpaidChildren =
    (data?.children.left != null && !data.children.left.hasPaidContribution) ||
    (data?.children.right != null && !data.children.right.hasPaidContribution);

  useEffect(() => {
    if (!hasIncomingForModal) {
      setShowIncomingModal(false);
    }
  }, [hasIncomingForModal]);

  function closePaymentModal() {
    setShowPaymentModal(false);
    setModalDismissed(true);
  }

  function openPaymentModal() {
    setShowPaymentModal(true);
  }

  function closeIncomingModal() {
    setShowIncomingModal(false);
    setIncomingModalDismissed(true);
    incomingDismissedRef.current = true;
  }

  function openIncomingModal() {
    setShowIncomingModal(true);
    incomingDismissedRef.current = false;
    setIncomingModalDismissed(false);
  }

  function closeMergeModal() {
    setShowMergeModal(false);
    setMergeModalDismissed(true);
  }

  function openAwaitingConfirmationModal() {
    setShowAwaitingConfirmationModal(true);
  }

  async function claimPayment(contributionId: string, file: File) {
    setActing(contributionId);
    setActionMessage(null);
    try {
      const proofForm = new FormData();
      proofForm.append("file", file);

      const proofRes = await fetch(`/api/contributions/${contributionId}/proof`, {
        method: "POST",
        body: proofForm,
      });
      const proofJson = await proofRes.json();
      if (!proofRes.ok) {
        setActionMessage(proofJson.error || "Failed to upload screenshot");
        return;
      }

      const res = await fetch(`/api/contributions/${contributionId}/claim`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMessage(json.error || "Failed to submit payment");
        await fetchData();
        return;
      }
      setActionMessage(json.message || "Payment submitted — awaiting confirmation");
      setShowPaymentModal(false);
      setShowMergeModal(false);
      setShowAwaitingConfirmationModal(true);
      setModalDismissed(true);
      await fetchData();
    } finally {
      setActing(null);
    }
  }

  async function approvePayment(contributionId: string) {
    setActing(contributionId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/contributions/${contributionId}/confirm`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMessage(json.error || "Failed to confirm payment");
        await fetchData();
        return;
      }
      setActionMessage(json.message || "Payment confirmed");
      setShowIncomingModal(false);
      await fetchData();
    } finally {
      setActing(null);
    }
  }

  async function declinePayment(contributionId: string) {
    setActing(contributionId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/contributions/${contributionId}/decline`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setActionMessage(json.error || "Failed to decline payment");
      } else {
        setActionMessage(json.message || "Payment declined");
      }
      setShowIncomingModal(false);
      await fetchData();
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        <p className="text-sm text-slate-500">Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
        Unable to load dashboard data
      </div>
    );
  }

  const { member, contributions, matrixProgress, paymentStatus } = data;

  const notificationCount = contributions.incoming.filter(
    (c) => c.status === "awaiting_confirmation"
  ).length;

  return (
    <div className="space-y-5 sm:space-y-6">
      <DashboardHeader fullName={member.fullName} notificationCount={notificationCount} />

      {actionMessage && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          {actionMessage}
        </div>
      )}

      <AdminContactAlert member={member} />
      <AwaitingMergeModal
        open={
          showMergeModal &&
          matrixProgress.waitingForRematch &&
          !awaitingContribution &&
          !member.parentId
        }
        cyclesCompleted={matrixProgress.cyclesCompleted}
        onClose={closeMergeModal}
      />
      <CycleCompleteModal
        open={showCycleCompleteModal}
        cycleNumber={matrixProgress.cyclesCompleted}
        payoutAmount={matrixProgress.payoutAmount}
        totalEarned={member.payoutAmount}
        onClose={() => setShowCycleCompleteModal(false)}
      />
      {awaitingContribution && (
        <AwaitingConfirmationModal
          open={showAwaitingConfirmationModal}
          parentName={
            member.parentId?.fullName ??
            (typeof awaitingContribution.toMemberId === "object"
              ? awaitingContribution.toMemberId.fullName
              : "your upline")
          }
          amount={awaitingContribution.amount}
          bankName={member.parentId?.bankName}
          accountNumber={member.parentId?.accountNumber}
          accountName={member.parentId?.accountName}
          onClose={() => setShowAwaitingConfirmationModal(false)}
        />
      )}
      <AwaitingRematchNotice matrixProgress={matrixProgress} />
      <MatrixResetNotice member={member} matrixProgress={matrixProgress} />
      <RematchNotice member={member} matrixProgress={matrixProgress} />

      {needsPayment && pendingContribution && member.parentId && (
        <PaymentPromptModal
          open={showPaymentModal}
          parentName={member.parentId.fullName}
          parentPhone={member.parentId.phone}
          bankName={member.parentId.bankName}
          accountNumber={member.parentId.accountNumber}
          accountName={member.parentId.accountName}
          amount={matrixProgress.contributionOwed}
          contributionId={pendingContribution._id}
          onClaim={claimPayment}
          claiming={acting === pendingContribution._id}
          onClose={closePaymentModal}
        />
      )}
      {hasIncomingForModal && (
        <IncomingContributionModal
          open={showIncomingModal}
          contributions={incomingForModal}
          onApprove={approvePayment}
          onDecline={declinePayment}
          acting={acting}
          onClose={closeIncomingModal}
        />
      )}

      <IncomingPaymentAlert
        contributions={contributions}
        onApprove={approvePayment}
        onDecline={declinePayment}
        acting={acting}
        onOpenModal={openIncomingModal}
        showDismissedReminder={incomingModalDismissed && hasIncomingForModal}
      />
      <ContributionAlert
        member={member}
        matrixProgress={matrixProgress}
        contributions={contributions}
        onOpenModal={openPaymentModal}
        onOpenAwaitingModal={openAwaitingConfirmationModal}
        showDismissedReminder={modalDismissed && needsPayment}
      />

      <DashboardStats data={data} />

      <ProfileCard member={member} paymentStatus={paymentStatus} />

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <YourPaymentCard contributions={contributions} />
        <IncomingContributionsCard
          contributions={contributions}
          onApprove={approvePayment}
          onDecline={declinePayment}
          acting={acting}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-1 lg:gap-6">
        <RecentActivityCard data={data} />
      </div>
    </div>
  );
}
