import { Suspense } from "react";
import type { ReactNode } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth/identity";

export const instant = false;

async function ProtectedAdminArea({ children }: { children: ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <AdminShell
      userName={profile.full_name ?? ""}
      email={profile.email}
    >
      {children}
    </AdminShell>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main
          className="min-h-screen bg-slate-950 px-4 py-16 text-center text-slate-300 sm:px-6 sm:py-24"
          aria-busy="true"
        >
          Verificando acceso administrativo…
        </main>
      }
    >
      <ProtectedAdminArea>{children}</ProtectedAdminArea>
    </Suspense>
  );
}
