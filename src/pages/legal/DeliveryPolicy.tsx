import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

const DeliveryPolicy = () => (
  <LegalPageLayout
    title="Política de Entrega"
    description="Informações sobre prazos, modalidades e responsabilidades na entrega das joias pedidas nas lojas Amada Amante."
    sections={[
      {
        id: "modalidades",
        title: "Modalidades de entrega",
        content: (
          <p>
            A entrega pode ocorrer por envio (correios ou transportadora), retirada combinada ou
            outra forma acordada entre cliente e revendedora. A opção disponível depende da loja e
            da região.
          </p>
        ),
      },
      {
        id: "prazos",
        title: "Prazos",
        content: (
          <p>
            Os prazos começam após a confirmação do pedido e, quando exigido, do pagamento. Estimativas
            informadas no atendimento são referenciais e podem variar por localização, feriados e
            desempenho do transportador.
          </p>
        ),
      },
      {
        id: "endereco",
        title: "Endereço e contato",
        content: (
          <p>
            É essencial informar endereço completo e telefone atualizados. Falhas de entrega por dados
            incompletos ou ausência do destinatário podem gerar nova tentativa, custo adicional ou
            retorno da mercadoria.
          </p>
        ),
      },
      {
        id: "custos",
        title: "Custos de frete",
        content: (
          <p>
            Frete cortesia, frete pago ou condições especiais seguem a comunicação da loja (por
            exemplo, faixa superior do site ou conversa no WhatsApp). Em caso de dúvida, confirme com
            a revendedora antes do envio.
          </p>
        ),
      },
      {
        id: "rastreio",
        title: "Acompanhamento",
        content: (
          <p>
            Quando houver código de rastreio, ele será compartilhado pela revendedora. A plataforma
            pode registrar o status do pedido (novo, confirmado, pago, enviado etc.), mas o detalhe
            logístico fica com a operação da loja e o transportador.
          </p>
        ),
      },
      {
        id: "avarias-transporte",
        title: "Avarias no transporte",
        content: (
          <p>
            Ao receber, confira a embalagem. Se houver indício de dano, registre fotos e avise a
            revendedora imediatamente para abrir o fluxo de análise conforme a Política de Trocas e
            Devoluções.
          </p>
        ),
      },
      {
        id: "responsabilidades",
        title: "Responsabilidades",
        content: (
          <p>
            A revendedora coordena a entrega da sua loja. A Amada Amante fornece a plataforma de
            pedidos e estoque. Transportadoras e serviços de terceiros possuem regras próprias; atrasos
            ou extravios serão tratados caso a caso com bom senso e respaldo documental.
          </p>
        ),
      },
    ]}
  />
);

export default DeliveryPolicy;
