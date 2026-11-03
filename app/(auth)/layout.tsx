import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f2ec] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-32 -top-40 h-96 w-96 rounded-full bg-[#dce8ff] opacity-70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-32 h-[30rem] w-[30rem] rounded-full bg-[#f8dfc7] opacity-60 blur-3xl" />
      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
        {children}
      </div>
    </main>
  );
}
