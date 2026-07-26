import type { WithdrawalStatus } from "@/types/withdrawals";
import {
  WITHDRAWAL_STATUS_LABELS,
  withdrawalStatusBadgeClass,
} from "@/lib/withdrawalStatus";

export function WithdrawalStatusBadge({ status }: { status: WithdrawalStatus }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${withdrawalStatusBadgeClass(status)}`}
    >
      {WITHDRAWAL_STATUS_LABELS[status] ?? status}
    </span>
  );
}
