import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6 sm:py-16">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-white"
        >
          JOHNNY<span className="text-cyan-400">.</span>
        </Link>
        <section className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            {eyebrow}
          </p>
          <h1 className="mt-3 break-words text-[clamp(1.75rem,6vw,2rem)] font-bold">{title}</h1>
          <p className="mt-3 mb-7 leading-6 text-slate-400">{description}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
