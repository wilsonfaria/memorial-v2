"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Mail, MailOpen } from "lucide-react";
import { markMessageReadAction, deleteMessageAction } from "@/lib/actions/contact-actions";
import DeleteButton from "@/components/admin/DeleteButton";

type Message = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  read: boolean;
  emailSent: boolean;
  createdAt: Date;
};

function makeFormData(fields: Record<string, string | number>) {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, String(value));
  return fd;
}

export default function MessageRow({ message }: { message: Message }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-paper-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setExpanded((v) => !v);
            if (!message.read) markMessageReadAction(makeFormData({ id: message.id }));
          }}
          className="flex flex-1 items-center gap-3 text-left"
        >
          {message.read ? (
            <MailOpen size={15} className="shrink-0 text-slate-300" />
          ) : (
            <Mail size={15} className="shrink-0 text-brand-600" />
          )}
          <div className="min-w-0 flex-1">
            <p className={`truncate text-sm ${message.read ? "font-medium text-slate-700" : "font-semibold text-brand-900"}`}>
              {message.name}
              {message.subject ? ` — ${message.subject}` : ""}
            </p>
            <p className="truncate text-xs text-slate-400">
              {message.email} · {new Date(message.createdAt).toLocaleString("pt-BR")}
              {!message.emailSent && " · notificação por email não enviada"}
            </p>
          </div>
          {expanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
        </button>
        <DeleteButton
          action={deleteMessageAction}
          id={message.id}
          confirmMessage={`Remover a mensagem de "${message.name}"?`}
        />
      </div>

      {expanded && (
        <div className="mt-3 border-t border-paper-200 pt-3 text-sm text-slate-600">
          {message.phone && <p className="mb-2 text-xs text-slate-400">Telefone: {message.phone}</p>}
          <p className="whitespace-pre-wrap">{message.message}</p>
        </div>
      )}
    </div>
  );
}
