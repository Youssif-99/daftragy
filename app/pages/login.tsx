'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    setIsSubmitting(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) throw signInError;
      setNotice(`Signed in as ${data.user.email ?? email.trim()}.`);
      setPassword('');
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to sign in. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f5f4ee] text-[#202c27] lg:grid lg:grid-cols-2">
      <section className="relative flex min-h-[240px] flex-col justify-between overflow-hidden bg-[#183d35] px-7 py-8 text-white sm:px-12 lg:min-h-dvh lg:px-16 lg:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(90deg,#ffffff_1px,transparent_1px),linear-gradient(#ffffff_1px,transparent_1px)] [background-size:44px_44px]"
        />
        <Link href="/login" className="relative w-fit text-xl font-semibold tracking-[0.04em]">
          daftargy<span className="text-[#edaa75]">.</span>
        </Link>
        <div className="relative mt-12 max-w-lg lg:mb-16 lg:mt-0">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.18em] text-[#b9d4c5]">
            Your workspace, in focus
          </p>
          <h2 className="max-w-md text-3xl font-semibold leading-tight sm:text-4xl">
            Pick up right where your best work begins.
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-6 text-[#d2e0d7]">
            A clearer place to keep your projects moving and your day in order.
          </p>
        </div>
        <p className="relative hidden text-xs text-[#b9d4c5] lg:block">A little more room to think.</p>
      </section>

      <section className="flex min-h-[calc(100dvh-240px)] items-center justify-center px-6 py-12 sm:px-12 lg:min-h-dvh">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <p className="text-sm font-medium text-[#9a523b]">Welcome back</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in to Daftargy</h1>
          <p className="mt-2 text-sm leading-6 text-[#64706a]">
            Enter your account details to continue.
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email address
              </label>
              <input
                autoComplete="email"
                className="h-12 w-full rounded-md border border-[#cbd1cb] bg-white px-3.5 text-sm outline-none transition focus:border-[#286454] focus:ring-2 focus:ring-[#286454]/15"
                id="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium">
                Password
              </label>
              <input
                autoComplete="current-password"
                className="h-12 w-full rounded-md border border-[#cbd1cb] bg-white px-3.5 text-sm outline-none transition focus:border-[#286454] focus:ring-2 focus:ring-[#286454]/15"
                id="password"
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </div>

            {error && <p role="alert" className="text-sm text-[#a43f34]">{error}</p>}
            {notice && <p role="status" className="text-sm text-[#286454]">{notice}</p>}

            <button
              className="flex h-12 w-full items-center justify-center rounded-md bg-[#b45138] px-4 text-sm font-semibold text-white transition hover:bg-[#98432f] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#183d35] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#64706a]">
            New to Daftargy?{' '}
            <Link className="font-semibold text-[#286454] underline-offset-4 hover:underline" href="/signup">
              Create an account
            </Link>
          </p>
        </motion.div>
      </section>
    </main>
  );
}