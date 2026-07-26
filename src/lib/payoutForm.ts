import type {
  BankAccountType,
  PaymentDetails,
  PayoutMethod,
  PixKeyType,
} from "@/types/withdrawals";

export type PayoutFormState = {
  method: PayoutMethod;
  pix_key_type: PixKeyType;
  pix_key: string;
  bank_code: string;
  bank_name: string;
  agency: string;
  account_number: string;
  account_digit: string;
  account_type: BankAccountType;
  account_holder_name: string;
  account_holder_document: string;
};

export const emptyPayoutForm = (): PayoutFormState => ({
  method: "pix",
  pix_key_type: "cpf",
  pix_key: "",
  bank_code: "",
  bank_name: "",
  agency: "",
  account_number: "",
  account_digit: "",
  account_type: "checking",
  account_holder_name: "",
  account_holder_document: "",
});

export function payoutFormToDetails(form: PayoutFormState): PaymentDetails {
  if (form.method === "pix") {
    return {
      pix_key_type: form.pix_key_type,
      pix_key: form.pix_key.trim(),
      account_holder_name: form.account_holder_name.trim(),
      account_holder_document: form.account_holder_document.trim(),
    };
  }
  return {
    bank_code: form.bank_code.trim() || undefined,
    bank_name: form.bank_name.trim() || undefined,
    agency: form.agency.trim(),
    account_number: form.account_number.trim(),
    account_digit: form.account_digit.trim() || undefined,
    account_type: form.account_type,
    account_holder_name: form.account_holder_name.trim(),
    account_holder_document: form.account_holder_document.trim(),
  };
}
