import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

const CommissionPolicy = () => (
  <LegalPageLayout
    title="Política de Comissões"
    description="Como a Amada Amante calcula e trata comissões da rede de sacoleiras (níveis 1, 2 e 3)."
    sections={[
      {
        id: "niveis",
        title: "Níveis 1, 2 e 3",
        content: (
          <p>
            A estrutura de indicações pode gerar comissão em até três níveis da rede. O nível 1
            corresponde à indicação direta; os níveis 2 e 3 abrangem níveis seguintes da árvore,
            conforme o cadastro e as regras ativas no momento da venda.
          </p>
        ),
      },
      {
        id: "taxas",
        title: "Taxas configuráveis",
        content: (
          <p>
            As percentagens de comissão por nível são configuráveis pelo administrador da plataforma.
            Alterações futuras de taxa não reescrevem automaticamente vendas já registradas com a
            taxa original.
          </p>
        ),
      },
      {
        id: "geracao",
        title: "Quando a comissão é gerada",
        content: (
          <p>
            A comissão só é gerada após o pedido ser marcado como pago. Pedidos apenas criados,
            confirmados ou com reserva expirada não geram comissão enquanto não houver pagamento
            reconhecido.
          </p>
        ),
      },
      {
        id: "cancelamentos",
        title: "Cancelamentos e reembolsos",
        content: (
          <p>
            Cancelamentos de pedidos pagos e reembolsos podem cancelar ou estornar comissões e
            movimentos de carteira relacionados, conforme as regras financeiras da plataforma.
            Comissões ainda pendentes ou disponíveis podem ser tratadas de forma diferente de
            comissões já pagas.
          </p>
        ),
      },
      {
        id: "taxa-original",
        title: "Taxa original da venda",
        content: (
          <p>
            Valores já calculados usam a taxa vigente no momento da venda. Mudanças posteriores nas
            configurações de comissão não alteram o histórico de pedidos antigos para efeito de
            cálculo já lançado.
          </p>
        ),
      },
      {
        id: "carteira",
        title: "Carteira e disponibilidade",
        content: (
          <p>
            Créditos de comissão podem aparecer como pendentes ou disponíveis na carteira da
            sacoleira. A liberação para saque segue a Política de Saques e as regras operacionais
            da Amada Amante.
          </p>
        ),
      },
    ]}
  />
);

export default CommissionPolicy;
