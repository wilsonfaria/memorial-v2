import { getTrashedItems, TRASH_RETENTION_DAYS } from "@/lib/trash";
import { purgeExpiredTrash } from "@/lib/trash";
import PageHeader from "@/components/admin/PageHeader";
import EmptyTrashButton from "./EmptyTrashButton";
import TrashRow from "./TrashRow";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  // Opportunistic sweep: purge anything past the retention window before we render the list.
  await purgeExpiredTrash();
  const items = await getTrashedItems();

  return (
    <>
      <PageHeader
        title="Lixeira"
        description={`Itens excluídos de todos os módulos ficam aqui por ${TRASH_RETENTION_DAYS} dias antes de serem removidos definitivamente (junto com arquivos como PDFs e imagens). Até lá, podem ser restaurados a qualquer momento.`}
        action={items.length > 0 ? <EmptyTrashButton count={items.length} /> : undefined}
      />

      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">A lixeira está vazia.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <TrashRow key={`${item.resource}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
