export type WithdrawalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "paid"
  | "cancelled";

export type PayoutMethod = "pix" | "bank_transfer";

export type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random";

export type BankAccountType = "checking" | "savings" | "corrente" | "poupanca";

export type PixPaymentDetails = {
  pix_key_type: PixKeyType;
  pix_key: string;
  account_holder_name: string;
  account_holder_document: string;
};

export type BankPaymentDetails = {
  bank_code?: string;
  bank_name?: string;
  agency: string;
  account_number: string;
  account_digit?: string;
  account_type: BankAccountType;
  account_holder_name: string;
  account_holder_document: string;
};

export type PaymentDetails = PixPaymentDetails | BankPaymentDetails;

export type WithdrawalSummary = {
  reseller_id: string;
  available: number;
  blocked: number;
  minimum_withdrawal_amount: number;
  open_requests: number;
  payout_method?: PayoutMethod | null;
  has_payout_profile: boolean;
};

export type WithdrawalListItem = {
  id: string;
  amount: number;
  status: WithdrawalStatus;
  payment_method: PayoutMethod;
  requested_at: string;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  receipt_url?: string | null;
  cancelled_at?: string | null;
};

export type AdminWithdrawalListItem = WithdrawalListItem & {
  reseller_id: string;
  reseller_name: string;
  reseller_email: string;
  approved_at?: string | null;
};

export type WithdrawalDetails = {
  id: string;
  reseller_id: string;
  reseller_name: string;
  reseller_email: string;
  amount: number;
  status: WithdrawalStatus;
  payment_method: PayoutMethod;
  payment_details: PaymentDetails | { masked: true; method: PayoutMethod };
  requested_at: string;
  approved_at?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  paid_at?: string | null;
  payment_reference?: string | null;
  receipt_url?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
};

export type WithdrawalRequest = WithdrawalDetails;

export type WithdrawalAuditItem = {
  id: string;
  action: string;
  previous_status: string | null;
  new_status: string | null;
  actor_user_id: string | null;
  actor_role: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdminWithdrawalStats = {
  pending_count: number;
  approved_count: number;
  paid_count_period: number;
  pending_amount: number;
};
