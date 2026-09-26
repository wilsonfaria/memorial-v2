import type { ReactNode } from "react";
import { getSession } from "@/lib/auth";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  if (!session) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-brand-50">
      <AdminSidebar username={session.username} />

      {/* Single measure for every admin screen: content stays centred and capped
          so fields never stretch edge-to-edge on wide monitors. */}
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
