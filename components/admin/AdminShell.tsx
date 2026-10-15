import Link from "next/link";
import type { ReactNode } from "react";
import AdminNavigation from "@/components/admin/AdminNavigation";
import { signOutAction } from "@/lib/auth/actions";

export default function AdminShell({
  children,
  userName,
  email,
}: {
  children: ReactNode;
  userName: string;
  email: string;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 shadow-lg shadow-black/10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5 lg:px-8">
          <Link href="/admin" className="min-w-0 break-words text-lg font-bold tracking-tight">
            JOHNNY<span className="text-cyan-300">.</span>
            <span className="ml-2 text-sm font-medium text-slate-400">Administración</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="hidden max-w-56 text-right sm:block">
              <p className="truncate text-sm font-medium text-white">{userName || "Administrador"}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
            <form action={signOutAction}>
              <button type="submit" className="button-secondary min-h-10 rounded-lg px-3">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[90rem] gap-5 px-4 py-5 sm:px-5 sm:py-7 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-7 lg:px-8">
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <AdminNavigation />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
