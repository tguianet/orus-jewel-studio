import { supabase } from "@/integrations/supabase/client";

/**
 * Cliente com tipagem relaxada para RPCs/colunas que só existem após as
 * migrations pendentes serem aplicadas no Lovable Cloud (expiração, saques,
 * referral code, relatórios, erros operacionais, multi-role).
 *
 * Runtime idêntico ao `supabase`; apenas evita erro de tipo enquanto os tipos
 * gerados não contêm esses objetos. Remover conforme as migrations forem
 * aplicadas e os tipos regenerados.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sbLoose = supabase as any;
