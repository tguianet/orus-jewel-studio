import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WithdrawalStatus } from "@/types/withdrawals";

export type WithdrawalFilterState = {
  status: WithdrawalStatus | "";
  search: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
};

type Props = {
  value: WithdrawalFilterState;
  onChange: (next: WithdrawalFilterState) => void;
};

export function WithdrawalFilters({ value, onChange }: Props) {
  const set = <K extends keyof WithdrawalFilterState>(key: K, v: WithdrawalFilterState[K]) =>
    onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-6">
      <div>
        <Label>Status</Label>
        <select
          className="mt-1.5 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={value.status}
          onChange={(e) => set("status", e.target.value as WithdrawalStatus | "")}
        >
          <option value="">Todos</option>
          <option value="pending">Pendente</option>
          <option value="approved">Aprovado</option>
          <option value="rejected">Rejeitado</option>
          <option value="paid">Pago</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>
      <div className="xl:col-span-2">
        <Label>Busca</Label>
        <Input
          className="mt-1.5"
          placeholder="Nome, email, referência…"
          value={value.search}
          onChange={(e) => set("search", e.target.value)}
        />
      </div>
      <div>
        <Label>De</Label>
        <Input type="date" className="mt-1.5" value={value.dateFrom} onChange={(e) => set("dateFrom", e.target.value)} />
      </div>
      <div>
        <Label>Até</Label>
        <Input type="date" className="mt-1.5" value={value.dateTo} onChange={(e) => set("dateTo", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Valor min</Label>
          <Input className="mt-1.5" inputMode="decimal" value={value.amountMin} onChange={(e) => set("amountMin", e.target.value)} />
        </div>
        <div>
          <Label>Valor max</Label>
          <Input className="mt-1.5" inputMode="decimal" value={value.amountMax} onChange={(e) => set("amountMax", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
