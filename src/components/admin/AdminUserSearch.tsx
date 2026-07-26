import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AdminSearchUser } from "@/types/adminManagement";

type Props = {
  onSearch: (query: string) => Promise<AdminSearchUser[]>;
  onSelect: (user: AdminSearchUser) => void;
  disabled?: boolean;
};

export function AdminUserSearch({ onSearch, onSelect, disabled }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<AdminSearchUser[]>([]);

  const runSearch = async () => {
    setError(null);
    const q = query.trim();
    if (q.length < 3) {
      setError("Digite ao menos 3 caracteres para buscar.");
      setResults([]);
      return;
    }
    try {
      setLoading(true);
      const items = await onSearch(q);
      setResults(items);
      if (items.length === 0) setError("Nenhum usuário encontrado.");
    } catch (e) {
      setResults([]);
      setError(e instanceof Error ? e.message : "Falha temporária. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="admin-user-search">Buscar por e-mail ou nome</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="admin-user-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder="ex.: jessica@email.com"
            disabled={disabled || loading}
            autoComplete="off"
          />
          <Button
            type="button"
            variant="goldOutline"
            onClick={() => void runSearch()}
            disabled={disabled || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Mínimo de 3 caracteres.</p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {results.map((user) => (
            <li
              key={user.user_id}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{user.nome || "—"}</p>
                <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {user.is_admin ? "Já é admin" : user.is_sacoleira ? "Sacoleira" : "Usuário"}
                </p>
              </div>
              <Button
                type="button"
                variant="gold"
                size="sm"
                disabled={disabled || user.is_admin}
                onClick={() => onSelect(user)}
              >
                {user.is_admin ? "Já admin" : "Selecionar"}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
