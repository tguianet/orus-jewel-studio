import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

const WithdrawalPolicy = () => (
  <LegalPageLayout
    title="Política de Saques"
    description="Orientações sobre solicitação de saque do saldo de comissões das sacoleiras na Amada Amante."
    sections={[
      {
        id: "aprovacao",
        title: "Aprovação do módulo de saque",
        content: (
          <p>
            O módulo de saque pode depender de aprovação e configuração da operação. Nem toda
            solicitação é processada automaticamente; a análise pode ser necessária antes do
            pagamento.
          </p>
        ),
      },
      {
        id: "saldo-bloqueado",
        title: "Saldo durante análise",
        content: (
          <p>
            Enquanto uma solicitação estiver em análise, parte do saldo pode ficar bloqueada para
            evitar uso duplicado do mesmo valor. Se o saque for recusado, o valor pode voltar à
            disponibilidade conforme o fluxo interno.
          </p>
        ),
      },
      {
        id: "dados-bancarios",
        title: "Dados bancários",
        content: (
          <p>
            A sacoleira é responsável por informar dados bancários ou de chave Pix corretos e
            atualizados. Erros de cadastro podem atrasar ou impedir o pagamento. A plataforma não se
            responsabiliza por valores enviados a contas informadas incorretamente.
          </p>
        ),
      },
      {
        id: "prazo",
        title: "Prazo de pagamento",
        content: (
          <p>
            O prazo de pagamento dos saques é definido pela operação da Amada Amante e pode variar
            conforme volume, calendário bancário e necessidade de verificação. Prazos estimados serão
            comunicados pelos canais oficiais quando o módulo estiver ativo.
          </p>
        ),
      },
      {
        id: "duplicidade",
        title: "Saques duplicados",
        content: (
          <p>
            Não são permitidos saques duplicados sobre o mesmo saldo. Tentativas repetidas ou
            conflitantes podem ser rejeitadas automaticamente ou na análise manual.
          </p>
        ),
      },
      {
        id: "irregularidades",
        title: "Irregularidades",
        content: (
          <p>
            Em caso de suspeita de fraude, inconsistência de comissões ou pedidos em disputa, a
            operação pode suspender saques até a regularização, sempre com registro interno do
            motivo.
          </p>
        ),
      },
    ]}
  />
);

export default WithdrawalPolicy;
