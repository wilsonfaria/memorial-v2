import Breadcrumb from "@/components/Breadcrumb";
import ContactForm from "./ContactForm";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <>
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Fale Conosco" }]} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 *:max-w-3xl">
        <h1 className="mb-1 text-2xl font-semibold text-brand-900">Fale Conosco</h1>
        <p className="mb-6 text-sm text-slate-500">
          Envie uma mensagem, sugestão ou dúvida sobre o acervo. Retornaremos assim que possível.
        </p>

        <ContactForm />
      </div>
    </>
  );
}
