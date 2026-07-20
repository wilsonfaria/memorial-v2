import { getEffectiveDbConfig } from "@/lib/db-config";
import DbConfigForm from "./DbConfigForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const current = getEffectiveDbConfig();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-2 text-xl font-semibold text-brand-900">Configurações do banco de dados</h1>
      <p className="mb-6 text-sm text-slate-500">
        Altere para onde o site se conecta (por exemplo, ao migrar do banco local para o banco de
        produção na hospedagem). A conexão é testada antes de qualquer alteração — se falhar, nada
        é salvo e o site continua funcionando normalmente com a conexão atual.
      </p>

      <div className="rounded-xl border border-brand-100 bg-white p-4">
        <DbConfigForm initial={current} />
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Observação: esta tela troca a conexão usada pelo site em tempo real. Ela não executa
        migrações — o banco de destino já precisa ter as tabelas criadas (via <code>prisma migrate deploy</code>).
      </p>
    </div>
  );
}
