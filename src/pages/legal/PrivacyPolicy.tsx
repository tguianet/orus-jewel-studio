import { LegalPageLayout } from "@/components/legal/LegalPageLayout";
import { LEGAL_CONTACT_EMAIL } from "@/lib/legalLinks";

const PrivacyPolicy = () => (
  <LegalPageLayout
    title="Política de Privacidade"
    description="Explicamos, de forma clara, quais dados coletamos na plataforma Amada Amante, para que usamos e como você pode exercer seus direitos."
    sections={[
      {
        id: "dados-coletados",
        title: "Dados coletados",
        content: (
          <>
            <p>Podemos coletar, conforme o uso da plataforma:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>nome completo;</li>
              <li>telefone / WhatsApp;</li>
              <li>endereço de entrega (quando informado);</li>
              <li>dados do pedido (itens, quantidades, valores e status);</li>
              <li>dados de cadastro de sacoleiras e administradores (como e-mail e perfil);</li>
              <li>registros técnicos de uso necessários para segurança e funcionamento.</li>
            </ul>
          </>
        ),
      },
      {
        id: "finalidade",
        title: "Finalidade do tratamento",
        content: (
          <>
            <p>Utilizamos os dados para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>processar pedidos e reservas de estoque;</li>
              <li>organizar entrega e comunicação com a revendedora responsável;</li>
              <li>prestar atendimento e suporte;</li>
              <li>prevenir fraudes, abusos e inconsistências operacionais;</li>
              <li>cumprir obrigações legais e melhorar a experiência na plataforma.</li>
            </ul>
          </>
        ),
      },
      {
        id: "base-legal",
        title: "Base legal",
        content: (
          <p>
            O tratamento ocorre com base na execução de contrato ou de procedimentos preliminares
            relacionados a compras e cadastros, no legítimo interesse para segurança e melhoria do
            serviço, e no cumprimento de obrigações legais, quando aplicável — sempre nos limites da
            Lei Geral de Proteção de Dados (LGPD).
          </p>
        ),
      },
      {
        id: "compartilhamento",
        title: "Compartilhamento",
        content: (
          <>
            <p>Os dados do pedido podem ser compartilhados com:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>a revendedora (sacoleira) responsável pela loja em que a compra foi feita;</li>
              <li>transportadoras ou parceiros de entrega, quando houver envio;</li>
              <li>prestadores necessários à operação da plataforma (hospedagem, autenticação e infraestrutura).</li>
            </ul>
            <p>Não vendemos seus dados pessoais.</p>
          </>
        ),
      },
      {
        id: "retencao",
        title: "Tempo de retenção",
        content: (
          <p>
            Mantemos os dados pelo tempo necessário para cumprir as finalidades desta política,
            atender obrigações legais ou regulatórias e preservar registros de pedidos, cancelamentos
            e atendimento. Quando não houver mais necessidade, os dados podem ser anonimizados ou
            excluídos, conforme viabilidade técnica e legal.
          </p>
        ),
      },
      {
        id: "seguranca",
        title: "Segurança",
        content: (
          <p>
            Adotamos medidas técnicas e organizacionais para proteger os dados contra acesso não
            autorizado, perda ou uso indevido. Nenhum sistema é 100% livre de riscos; pedimos que você
            também cuide das informações enviadas e dos dispositivos utilizados.
          </p>
        ),
      },
      {
        id: "direitos",
        title: "Direitos do titular",
        content: (
          <>
            <p>Você pode solicitar, nos termos da LGPD:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>confirmação da existência de tratamento;</li>
              <li>acesso aos dados;</li>
              <li>correção de dados incompletos, inexatos ou desatualizados;</li>
              <li>anonimização, bloqueio ou eliminação, quando cabível;</li>
              <li>informação sobre compartilhamentos;</li>
              <li>revogação de consentimento, quando esta for a base utilizada.</li>
            </ul>
          </>
        ),
      },
      {
        id: "contato",
        title: "Contato para solicitações",
        content: (
          <p>
            Para pedidos de acesso, correção ou exclusão, entre em contato pelo e-mail{" "}
            <a className="text-primary hover:underline" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
              {LEGAL_CONTACT_EMAIL}
            </a>
            {" "}ou pelo canal de atendimento da loja/revendedora responsável. Responderemos no prazo
            razoável previsto na legislação.
          </p>
        ),
      },
      {
        id: "cookies",
        title: "Cookies e armazenamento local",
        content: (
          <p>
            Podemos usar cookies, armazenamento local do navegador e recursos semelhantes para manter
            sessão, carrinho, preferências da loja e funcionamento do checkout. Você pode gerenciar
            cookies nas configurações do navegador; a desativação pode afetar partes da experiência.
          </p>
        ),
      },
      {
        id: "atualizacao",
        title: "Atualizações desta política",
        content: (
          <p>
            Esta política pode ser atualizada para refletir mudanças na plataforma ou na legislação.
            A data da última atualização aparece no topo da página. O uso continuado após mudanças
            relevantes indica ciência da versão vigente.
          </p>
        ),
      },
    ]}
  />
);

export default PrivacyPolicy;
