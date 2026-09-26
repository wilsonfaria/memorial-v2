"use client";

import { useActionState, useEffect, useRef } from "react";
import { createHeroSlideAction, type ActionState } from "@/lib/actions/hero-slide-actions";
import HeroSlideFields from "./HeroSlideFields";

export default function HeroSlideForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createHeroSlideAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      <HeroSlideFields />

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? "Criando..." : "Adicionar slide"}
      </button>
    </form>
  );
}
