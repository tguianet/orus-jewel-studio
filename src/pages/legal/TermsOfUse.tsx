import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

const TermsOfUse = () => (
  <LegalPageLayout
    title="Termos de Uso"
    description="Regras gerais para uso da plataforma Amada Amante, compras nas lojas das revendedoras e responsabilidades de cada parte."
    sections={[
      {
        id: "cadastro-compras",
        title: "Cadastro e compras",
        content: (
          <p>
            A plataforma permite que clientes comprem nas lojas virtuais das sacoleiras e que
            revendedoras e administradores utilizem painéis próprios. Ao usar o serviço, você declara
            ter capacidade legal para contratar e fornecer informações verdadeiras.
          </p>
        ),
      },
      {
        id: "responsabilidade-informacoes",
        title: "Responsabilidade pelas informações",
        content: (
          <p>
            Nome, telefone, endereço e demais dados informados são de responsabilidade de quem os
            envia. Dados incorretos podem atrasar atendimento, entrega ou inviabilizar o pedido.
          </p>
        ),
      },
      {
        id: "disponibilidade",
        title: "Disponibilidade de produtos",
        content: (
          <p>
            A disponibilidade das joias depende do estoque e da configuração da loja. A reserva
            ocorre no momento da criação do pedido, sujeita às regras de expiração e cancelamento.
          </p>
        ),
      },
      {
        id: "precos",
        title: "Preços",
        content: (
          <p>
            Os preços exibidos na loja são definidos pela operação e pela revendedora. O valor final
            do pedido é confirmado pelo sistema no envio. Impostos, frete ou condições especiais
            devem ser combinados conforme a política da loja.
          </p>
        ),
      },
      {
        id: "reserva-estoque",
        title: "Reserva de estoque",
        content: (
          <p>
            Ao criar um pedido online, o estoque pode ficar reservado por um período limitado. Se o
            pagamento ou a confirmação não ocorrerem a tempo, a reserva pode expirar e o pedido ser
            cancelado automaticamente, liberando as unidades.
          </p>
        ),
      },
      {
        id: "pagamento",
        title: "Pagamento",
        content: (
          <p>
            O pagamento é combinado com a revendedora responsável, salvo indicação em contrário na
            loja. A plataforma pode registrar o pedido como pago após confirmação administrativa.
            Comissão e efeitos financeiros seguem as políticas específicas.
          </p>
        ),
      },
      {
        id: "cancelamento",
        title: "Cancelamento",
        content: (
          <p>
            Pedidos podem ser cancelados conforme status, regras operacionais e disponibilidade.
            Cancelamentos podem restaurar estoque e, quando houver pagamento e comissões, seguir as
            regras de estorno previstas nas políticas financeiras.
          </p>
        ),
      },
      {
        id: "devolucao",
        title: "Devolução",
        content: (
          <p>
            Devoluções físicas e financeiras observam a Política de Trocas e Devoluções. Nem todo
            cancelamento implica devolução física, e nem toda devolução implica reembolso imediato.
          </p>
        ),
      },
      {
        id: "troca",
        title: "Troca",
        content: (
          <p>
            Solicitações de troca dependem de análise da peça, prazo e condições informadas na
            política de trocas. A troca pode gerar registro operacional sem liberação automática de
            novo produto em estoque, conforme regras internas.
          </p>
        ),
      },
      {
        id: "revendedora",
        title: "Responsabilidade da revendedora",
        content: (
          <p>
            Cada sacoleira é responsável pelo atendimento da sua loja, comunicação com o cliente,
            combinações de pagamento e entrega, dentro das diretrizes da marca e da plataforma.
          </p>
        ),
      },
      {
        id: "propriedade-intelectual",
        title: "Propriedade intelectual",
        content: (
          <p>
            Marca, logotipo, textos, layout, fotos e demais conteúdos da Amada Amante e das lojas
            protegidos por direitos autorais ou marca não podem ser copiados ou usados sem
            autorização, exceto o necessário para uso legítimo da plataforma.
          </p>
        ),
      },
      {
        id: "limitacoes",
        title: "Limitações de responsabilidade",
        content: (
          <p>
            A plataforma busca estabilidade e segurança, mas não se responsabiliza por interrupções
            temporárias, falhas de terceiros (internet, dispositivos, transportadoras) ou danos
            indiretos decorrentes do uso indevido do serviço. Em qualquer hipótese, a responsabilidade
            fica limitada ao permitido pela lei aplicável.
          </p>
        ),
      },
    ]}
  />
);

export default TermsOfUse;
