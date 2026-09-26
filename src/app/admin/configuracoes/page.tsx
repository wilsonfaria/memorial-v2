import { getEffectiveDbConfig } from "@/lib/db-config";
import { readSmtpConfig } from "@/lib/smtp-config";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import DbConfigForm from "./DbConfigForm";
import SmtpConfigForm from "./SmtpConfigForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const current = getEffectiveDbConfig();
  const smtpCurrent = readSmtpConfig();

  return (
    <>
      <PageHeader
        title="Configurações"
        description="Conexões de infraestrutura do site: banco de dados e envio de email. Ambas são testadas antes de salvar — se o teste falhar, nada é alterado."
      />

      <div className="flex flex-col gap-6">
        <Card
          title="Banco de dados"
          description="Define para onde o site se conecta (por exemplo, ao migrar do banco local para o de produção). Esta tela troca a conexão em tempo real, mas não executa migrações — o banco de destino já precisa ter as tabelas criadas."
        >
          <DbConfigForm initial={current} />
        </Card>

        <Card
          title="Email (SMTP)"
          description="Usado para enviar os emails de redefinição de senha dos administradores. A conexão é validada com login real no servidor antes de salvar."
        >
          <SmtpConfigForm initial={smtpCurrent} />
        </Card>
      </div>
    </>
  );
}
