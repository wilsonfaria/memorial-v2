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

      <main className="min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-7 lg:px-8 2xl:px-10">
        <div className="w-full min-w-0">{children}</div>
      </main>
    </div>
  );
}
