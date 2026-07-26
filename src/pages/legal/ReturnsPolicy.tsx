import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

const ReturnsPolicy = () => (
  <LegalPageLayout
    title="Política de Trocas e Devoluções"
    description="Como funcionam troca, devolução física, reembolso e a diferença em relação ao cancelamento de pedidos na Amada Amante."
    sections={[
      {
        id: "prazo",
        title: "Prazo",
        content: (
          <p>
            Solicitações de troca ou devolução devem ser feitas o quanto antes após o recebimento,
            preferencialmente em até 7 dias corridos, salvo prazo diferente combinado com a
            revendedora ou exigido por lei. Pedidos ainda não pagos ou com reserva expirada seguem
            as regras de cancelamento.
          </p>
        ),
      },
      {
        id: "condicoes",
        title: "Condições da peça",
        content: (
          <p>
            A peça deve estar em bom estado, sem sinais de uso indevido, sem alterações e, quando
            aplicável, com etiquetas e acessórios originais. Peças personalizadas ou com higiene
            comprometida podem não ser aceitas para troca ou devolução.
          </p>
        ),
      },
      {
        id: "embalagem",
        title: "Embalagem",
        content: (
          <p>
            Sempre que possível, devolva o produto na embalagem original ou em embalagem adequada
            que evite danos no transporte. A análise considera o estado da peça e da embalagem.
          </p>
        ),
      },
      {
        id: "avariados",
        title: "Produtos avariados",
        content: (
          <p>
            Se receber um produto com defeito de fabricação ou avaria de transporte, registre fotos e
            entre em contato imediatamente com a revendedora. Após análise, poderemos orientar troca,
            reparo, crédito ou outra solução cabível.
          </p>
        ),
      },
      {
        id: "devolucao-fisica",
        title: "Devolução física",
        content: (
          <p>
            A devolução física é o retorno da peça ao estoque/operação após análise. Ela é registrada
            no sistema com a condição do produto e a ação definida. Nem toda devolução física gera
            reembolso automático — isso depende do status financeiro do pedido.
          </p>
        ),
      },
      {
        id: "reembolso",
        title: "Reembolso financeiro",
        content: (
          <p>
            Reembolsos de pedidos pagos seguem fluxo administrativo próprio. Cancelamento pago e
            reembolso podem impactar comissões e carteira conforme a política de comissões. Prazos e
            forma de devolução do valor são combinados com a operação.
          </p>
        ),
      },
      {
        id: "diferencas",
        title: "Troca, devolução e cancelamento",
        content: (
          <>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong className="font-medium">Cancelamento:</strong> encerra o pedido antes ou
                durante o fluxo operacional; pode liberar estoque reservado.
              </li>
              <li>
                <strong className="font-medium">Devolução:</strong> a peça volta após envio/recebimento;
                envolve análise física e possível ajuste financeiro.
              </li>
              <li>
                <strong className="font-medium">Troca:</strong> substituição ou pendência de substituição
                após análise; não se confunde com cancelamento automático nem com reembolso.
              </li>
            </ul>
          </>
        ),
      },
      {
        id: "analise",
        title: "Análise do produto",
        content: (
          <p>
            Toda peça devolvida ou enviada para troca passa por análise. Até a conclusão, o processo
            pode ficar pendente. A decisão final considera condição do produto, prazo, histórico do
            pedido e as regras desta política.
          </p>
        ),
      },
    ]}
  />
);

export default ReturnsPolicy;
