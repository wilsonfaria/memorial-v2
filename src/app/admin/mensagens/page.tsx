import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/admin/PageHeader";
import MessageRow from "./MessageRow";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <PageHeader
        title="Mensagens"
        description="Mensagens enviadas pelo formulário público “Fale Conosco”. O email de notificação é apenas um aviso extra — esta lista é sempre a fonte confiável."
      />

      <div className="flex flex-col gap-1">
        {messages.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">Nenhuma mensagem recebida ainda.</p>
        )}
        {messages.map((m) => (
          <MessageRow key={m.id} message={m} />
        ))}
      </div>
    </>
  );
}
