"use client";

import { Trash2 } from "lucide-react";

export default function DeleteButton({
  action,
  id,
  confirmMessage,
}: {
  action: (formData: FormData) => void;
  id: number;
  confirmMessage: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
        title="Remover"
      >
        <Trash2 size={13} />
      </button>
    </form>
  );
}
