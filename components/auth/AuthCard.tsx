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
    <main className="flex min-h-screen items-center bg-transparent px-4 py-10 text-white sm:px-6 sm:py-16">
      <div className="mx-auto max-w-md">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-white"
        >
          JOHNNY<span className="text-cyan-400">.</span>
        </Link>
        <section className="surface-card mt-8 p-5 sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
            {eyebrow}
          </p>
          <h1 className="mt-3 break-words text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 mb-7 leading-6 text-slate-400">{description}</p>
          {children}
        </section>
      </div>
    </main>
  );
}
