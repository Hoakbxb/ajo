export type PaymentStatus = "unpaid" | "pending" | "completed";

export function getPaymentStatus(
  member: { hasPaidContribution: boolean; position: string },
  outgoingContributions: { status: string }[]
): PaymentStatus {
  if (member.hasPaidContribution) {
    return "completed";
  }

  const outgoing = outgoingContributions[0];
  if (outgoing?.status === "awaiting_confirmation") {
    return "pending";
  }

  return "unpaid";
}

export function formatPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "unpaid":
      return "Payment Required";
    case "pending":
      return "Pending";
    case "completed":
      return "Completed";
  }
}

export function formatContributionStatusLabel(status: string): string {
  switch (status) {
    case "awaiting_confirmation":
      return "Pending";
    case "confirmed":
      return "Completed";
    case "pending":
      return "Unpaid";
    case "declined":
      return "Declined";
    default:
      return status.replace("_", " ");
  }
}

export function paymentStatusBadgeClass(status: PaymentStatus): string {
  switch (status) {
    case "unpaid":
      return "bg-orange-100 text-orange-800";
    case "pending":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-emerald-100 text-emerald-800";
  }
}

export function contributionStatusBadgeClass(status: string): string {
  switch (status) {
    case "confirmed":
      return "bg-emerald-100 text-emerald-700";
    case "awaiting_confirmation":
      return "bg-blue-100 text-blue-700";
    case "declined":
      return "bg-red-100 text-red-700";
    default:
      return "bg-orange-100 text-orange-700";
  }
}
