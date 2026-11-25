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
    <div className="admin-shell min-h-screen text-slate-900">
      <header className="admin-topbar sticky top-0 z-40 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-5 lg:px-8">
          <Link href="/admin" className="min-w-0 break-words text-lg font-bold tracking-tight lg:hidden">
            JOHNNY<span className="text-cyan-300">.</span>
            <span className="ml-2 text-sm font-medium text-slate-400">Administración</span>
          </Link>
          <div className="hidden flex-1 items-center gap-2 pl-2 text-sm lg:flex">
            <span className="font-semibold text-slate-400">Administración</span>
            <span className="text-slate-300" aria-hidden="true">/</span>
            <span className="font-bold text-slate-800">Panel general</span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <div className="lg:hidden">
              <AdminNavigation variant="mobile" />
            </div>
            <div className="hidden max-w-56 text-right sm:block">
              <p className="truncate text-sm font-semibold text-slate-900">{userName || "Administrador"}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
            <form action={signOutAction}>
              <button type="submit" className="admin-signout min-h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-700">
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-[100rem] gap-5 px-4 py-5 sm:px-5 sm:py-7 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-7 lg:px-8">
        <aside className="admin-sidebar hidden min-w-0 rounded-2xl p-3 text-white lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="mb-5 px-2 pt-2">
            <p className="text-lg font-extrabold tracking-tight">JOHNNY<span className="text-sky-300">.</span></p>
            <p className="text-[11px] text-blue-100/60">Asesoría tecnológica</p>
          </div>
          <AdminNavigation variant="desktop" />
        </aside>
        <div className="admin-main min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}
