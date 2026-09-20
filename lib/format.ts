export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function statusBadgeClass(status: string): string {
  switch (status) {
    case "approved":
    case "completed":
    case "accepted":
      return "badge-green";
    case "pending":
      return "badge-yellow";
    case "rejected":
      return "badge-red";
    case "cancelled":
      return "badge-gray";
    default:
      return "badge-gray";
  }
}

export function availabilityBadgeClass(availability: string): string {
  switch (availability) {
    case "available":
      return "badge-green";
    case "reserved":
      return "badge-yellow";
    case "swapped":
      return "badge-gray";
    default:
      return "badge-gray";
  }
}

export function formatAcceptanceRate(rate: number | null): string {
  if (rate === null) return "No requests yet";
  return `${Math.round(rate * 100)}%`;
}
