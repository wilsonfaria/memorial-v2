import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen min-w-0 overflow-x-clip bg-brand-50">
      <AdminSidebar username={session.username} />

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full min-w-0 max-w-[96rem]">{children}</div>
      </main>
    </div>
  );
}
