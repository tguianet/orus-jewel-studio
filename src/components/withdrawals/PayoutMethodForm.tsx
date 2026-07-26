import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { BankAccountType, PixKeyType } from "@/types/withdrawals";
import type { PayoutFormState } from "@/lib/payoutForm";

type Props = {
  value: PayoutFormState;
  onChange: (next: PayoutFormState) => void;
  disabled?: boolean;
};

export function PayoutMethodForm({ value, onChange, disabled }: Props) {
  const set = <K extends keyof PayoutFormState>(key: K, v: PayoutFormState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="space-y-4">
      <div>
        <Label>Método</Label>
        <div className="mt-1.5 flex gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => set("method", "pix")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${value.method === "pix" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}
          >
            PIX
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => set("method", "bank_transfer")}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm ${value.method === "bank_transfer" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"}`}
          >
            Transferência
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="holder">Nome do titular</Label>
        <Input
          id="holder"
          className="mt-1.5"
          disabled={disabled}
          value={value.account_holder_name}
          onChange={(e) => set("account_holder_name", e.target.value)}
          required
        />
      </div>
      <div>
        <Label htmlFor="doc">CPF/CNPJ do titular</Label>
        <Input
          id="doc"
          className="mt-1.5"
          disabled={disabled}
          value={value.account_holder_document}
          onChange={(e) => set("account_holder_document", e.target.value)}
          required
        />
      </div>

      {value.method === "pix" ? (
        <>
          <div>
            <Label htmlFor="pixType">Tipo de chave</Label>
            <select
              id="pixType"
              className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              disabled={disabled}
              value={value.pix_key_type}
              onChange={(e) => set("pix_key_type", e.target.value as PixKeyType)}
            >
              <option value="cpf">CPF</option>
              <option value="cnpj">CNPJ</option>
              <option value="email">E-mail</option>
              <option value="phone">Telefone</option>
              <option value="random">Aleatória</option>
            </select>
          </div>
          <div>
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input
              id="pixKey"
              className="mt-1.5"
              disabled={disabled}
              value={value.pix_key}
              onChange={(e) => set("pix_key", e.target.value)}
              required
            />
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="bankCode">Código banco</Label>
              <Input id="bankCode" className="mt-1.5" disabled={disabled} value={value.bank_code} onChange={(e) => set("bank_code", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="bankName">Nome do banco</Label>
              <Input id="bankName" className="mt-1.5" disabled={disabled} value={value.bank_name} onChange={(e) => set("bank_name", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="agency">Agência</Label>
              <Input id="agency" className="mt-1.5" disabled={disabled} value={value.agency} onChange={(e) => set("agency", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="account">Conta</Label>
              <Input id="account" className="mt-1.5" disabled={disabled} value={value.account_number} onChange={(e) => set("account_number", e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="digit">Dígito</Label>
              <Input id="digit" className="mt-1.5" disabled={disabled} value={value.account_digit} onChange={(e) => set("account_digit", e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="accType">Tipo de conta</Label>
            <select
              id="accType"
              className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              disabled={disabled}
              value={value.account_type}
              onChange={(e) => set("account_type", e.target.value as BankAccountType)}
            >
              <option value="checking">Corrente</option>
              <option value="savings">Poupança</option>
            </select>
          </div>
        </>
      )}
    </div>
  );
}
