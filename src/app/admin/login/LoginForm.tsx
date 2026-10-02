"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { loginAction, type ActionState } from "@/lib/actions/auth-actions";

const inputClass =
  "w-full rounded-lg bg-paper-100 px-3.5 py-2.5 text-sm text-slate-800 outline-none ring-1 ring-transparent transition placeholder:text-slate-400 focus:bg-white focus:ring-brand-500";

export default function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, undefined);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-xs">
        <span className="font-medium text-slate-600">Usuário</span>
        <input
          name="username"
          type="text"
          required
          autoFocus
          autoComplete="username"
          placeholder="Digite seu usuário"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-xs">
        <span className="flex items-center justify-between">
          <span className="font-medium text-slate-600">Senha</span>
          <Link href="/admin/esqueci-senha" className="font-medium text-brand-700 hover:underline">
            Esqueci minha senha
          </Link>
        </span>
        <span className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Digite sua senha"
            className={`${inputClass} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-600"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-brand-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
