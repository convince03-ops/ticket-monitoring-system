'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  CircleHelp,
  Clock3,
  Layers3,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  TicketCheck,
} from 'lucide-react';
import { supabase } from '@/lib/auth';
import { loginSchema } from '@/features/auth/validation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Check your sign-in details.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword(result.data);
      if (signInError) {
        setError(signInError.message === 'Invalid login credentials'
          ? 'Email or password is incorrect.'
          : signInError.message);
        return;
      }

      const profileResponse = await fetch('/api/requestor/me', {
        headers: { Authorization: `Bearer ${signInData.session.access_token}` },
        cache: 'no-store',
      });
      router.replace(profileResponse.ok ? '/requestor/dashboard' : '/');
      router.refresh();
    } catch {
      setError('Unable to sign in right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid w-full gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
      <section className="flex flex-col justify-between rounded-[2rem] border border-white/80 bg-[#e8edfa] p-7 shadow-[12px_12px_30px_rgba(34,48,82,0.10),-10px_-10px_28px_rgba(255,255,255,0.92),inset_1px_1px_0_rgba(255,255,255,0.8)] sm:p-10 lg:min-h-[650px] lg:p-12">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3.5 py-2 text-xs font-semibold tracking-wide text-[#304a82] shadow-[inset_2px_2px_5px_rgba(40,55,90,0.06),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]" />
            BRANDCOM · STAFF PORTAL
          </div>

          <h2 className="mt-8 max-w-xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-[#172b55] sm:text-5xl">
            Every request,
            <br />
            <span className="text-[#5176c9]">in its right place.</span>
          </h2>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-600">
            A calmer way to keep creative work moving. Pick up where your team left off and see what needs attention.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="col-span-2 rounded-[1.5rem] border border-white/80 bg-[#f9fbff] p-5 shadow-[7px_7px_18px_rgba(34,48,82,0.09),-6px_-6px_16px_rgba(255,255,255,0.9),inset_1px_1px_0_rgba(255,255,255,0.95)] sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#7082a7]">Your work, at a glance</p>
                <p className="mt-2 text-lg font-semibold text-[#243a68]">A clear path from brief to done</p>
              </div>
              <span className="rounded-2xl bg-[#e7edff] p-3 text-[#4c70c1] shadow-[inset_2px_2px_5px_rgba(40,55,90,0.07),inset_-2px_-2px_5px_rgba(255,255,255,0.9)]">
                <Layers3 aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>
            <div className="mt-6 flex items-center gap-2">
              <span className="h-2 flex-1 rounded-full bg-[#5c7fce]" />
              <span className="h-2 flex-1 rounded-full bg-[#9bb0e3]" />
              <span className="h-2 flex-1 rounded-full bg-[#c4d0eb]" />
              <span className="h-2 flex-1 rounded-full bg-[#e2e8f4]" />
              <span className="h-2 flex-1 rounded-full bg-[#e2e8f4]" />
            </div>
            <div className="mt-3 flex justify-between text-[11px] font-medium text-slate-500">
              <span>Submitted</span>
              <span>In progress</span>
              <span>Completed</span>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/70 bg-[#dce8dc] p-4 shadow-[7px_7px_18px_rgba(34,48,82,0.08),-6px_-6px_16px_rgba(255,255,255,0.85),inset_1px_1px_0_rgba(255,255,255,0.75)] sm:p-5">
            <span className="inline-flex rounded-xl bg-white/70 p-2.5 text-[#507a5c] shadow-[inset_2px_2px_5px_rgba(40,55,90,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.85)]">
              <TicketCheck aria-hidden="true" className="h-5 w-5" />
            </span>
            <p className="mt-5 text-sm font-semibold text-[#294c35]">Keep tickets moving</p>
            <p className="mt-1 text-xs leading-5 text-[#597360]">Everything your team needs, together.</p>
          </div>

          <div className="rounded-[1.5rem] border border-white/70 bg-[#f7e5d3] p-4 shadow-[7px_7px_18px_rgba(34,48,82,0.08),-6px_-6px_16px_rgba(255,255,255,0.85),inset_1px_1px_0_rgba(255,255,255,0.75)] sm:p-5">
            <span className="inline-flex rounded-xl bg-white/70 p-2.5 text-[#a56235] shadow-[inset_2px_2px_5px_rgba(40,55,90,0.05),inset_-2px_-2px_5px_rgba(255,255,255,0.85)]">
              <Clock3 aria-hidden="true" className="h-5 w-5" />
            </span>
            <p className="mt-5 text-sm font-semibold text-[#70482e]">Know what’s next</p>
            <p className="mt-1 text-xs leading-5 text-[#8b674c]">Stay close to each handoff.</p>
          </div>
        </div>

        <div className="mt-8 hidden items-center gap-2 text-xs font-medium text-[#687998] lg:flex">
          <Check aria-hidden="true" className="h-4 w-4 text-emerald-600" />
          Built for the Prince Retail team
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/90 bg-[#fbfaf7] p-7 shadow-[14px_14px_34px_rgba(34,48,82,0.11),-10px_-10px_30px_rgba(255,255,255,0.95),inset_1px_1px_0_rgba(255,255,255,0.95)] sm:p-10 lg:flex lg:min-h-[650px] lg:flex-col lg:justify-center lg:p-12">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e4ebff] text-[#4268b5] shadow-[inset_3px_3px_7px_rgba(40,55,90,0.08),inset_-3px_-3px_7px_rgba(255,255,255,0.9)]">
            <ShieldCheck aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#6880b4]">Secure workspace</p>
            <p className="mt-0.5 text-sm font-medium text-[#34476f]">Authorized staff access</p>
          </div>
        </div>

        <h1 className="text-3xl font-semibold tracking-[-0.035em] text-[#1c2e52]">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Sign in with your Prince Retail company email to access Ticket Monitoring.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-[#34425e]">Company email</label>
            <div className="relative">
              <Mail aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8090ad]" />
              <input
                id="login-email"
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="name@princeretail.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : 'login-domain-hint'}
                className="w-full rounded-2xl border border-white bg-[#f2f3f5] py-3.5 pl-11 pr-4 text-sm text-slate-900 shadow-[inset_4px_4px_9px_rgba(37,50,78,0.08),inset_-4px_-4px_9px_rgba(255,255,255,0.9)] outline-none transition placeholder:text-slate-400 focus:border-[#9db5ec] focus:ring-4 focus:ring-[#dce6fb]"
              />
            </div>
            <p id="login-domain-hint" className="mt-2 text-xs text-slate-500">Only @princeretail.com addresses are accepted.</p>
          </div>

          <div>
            <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-[#34425e]">Password</label>
            <div className="relative">
              <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8090ad]" />
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'login-error' : undefined}
                className="w-full rounded-2xl border border-white bg-[#f2f3f5] py-3.5 pl-11 pr-4 text-sm text-slate-900 shadow-[inset_4px_4px_9px_rgba(37,50,78,0.08),inset_-4px_-4px_9px_rgba(255,255,255,0.9)] outline-none transition placeholder:text-slate-400 focus:border-[#9db5ec] focus:ring-4 focus:ring-[#dce6fb]"
              />
            </div>
          </div>

          {error && <p id="login-error" role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#365da8] px-4 py-3.5 text-sm font-semibold text-white shadow-[7px_7px_15px_rgba(40,64,116,0.2),-4px_-4px_10px_rgba(255,255,255,0.85),inset_1px_1px_0_rgba(255,255,255,0.25)] transition hover:-translate-y-0.5 hover:bg-[#2d5197] hover:shadow-[9px_9px_18px_rgba(40,64,116,0.24),-4px_-4px_10px_rgba(255,255,255,0.85)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {isSubmitting ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-7 flex items-start gap-3 border-t border-[#e9e9e5] pt-5">
          <CircleHelp aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#8290a9]" />
          <p className="text-xs leading-5 text-slate-500">
            Access is limited to authorized Prince Retail accounts. Contact your administrator if you need an account.
          </p>
        </div>
      </section>
    </div>
  );
}
