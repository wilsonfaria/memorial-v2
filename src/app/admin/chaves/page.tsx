import Link from "next/link";
import { ArrowRight } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import Card from "@/components/admin/Card";
import AiProviderPanel from "../edicoes/AiProviderPanel";
import MeiliConfigForm from "./MeiliConfigForm";
import { getProviderStatuses } from "@/lib/ai-providers/registry";
import { readMeiliConfig } from "@/lib/meili-config";
import { isMeiliConfigured } from "@/lib/search/meili";

export const dynamic = "force-dynamic";

export default function AdminVaultPage() {
  const providers = getProviderStatuses();
  const meiliConfigured = isMeiliConfigured();
  const meiliUrl = readMeiliConfig()?.url ?? process.env.MEILI_URL ?? "";

  return (
    <>
      <PageHeader
        title="Cofre de Chaves de API"
        description="Todas as credenciais de serviços externos que o site usa, num só lugar. Cada troca é testada com uma chamada real antes de ser aplicada — nada é salvo às cegas."
        action={
          <Link
            href="/admin/configuracoes"
            className="flex items-center gap-1.5 rounded-lg border border-paper-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-brand-300"
          >
            Banco de dados e SMTP ficam em Configurações
            <ArrowRight size={13} />
          </Link>
        }
      />

      <AiProviderPanel providers={providers} />

      <Card
        title="Busca (Meilisearch)"
        description="Motor de busca por palavra, tolerante a erro de OCR. Opcional — sem ele configurado, a busca funciona pelo MariaDB, só mais lenta e sem correção de digitação."
      >
        <MeiliConfigForm configured={meiliConfigured} url={meiliUrl} />
      </Card>
    </>
  );
}
