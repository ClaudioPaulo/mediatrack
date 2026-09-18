'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { sendOtp, verifyOtp } from '@/lib/auth';

type Step = 'email' | 'otp';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendOtp(email);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar o código.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyOtp(email, code);
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código inválido ou expirado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-2xl font-bold text-neutral-100">MediaTrack</h1>
        <p className="mb-8 text-sm text-neutral-400">
          {step === 'email'
            ? 'Introduz o teu e-mail para receberes um código de acesso.'
            : `Introduz o código de 6 dígitos enviado para ${email}.`}
        </p>

        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="o-teu-email@exemplo.com"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 outline-none focus:border-neutral-500"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? 'A enviar…' : 'Enviar código'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <input
              type="text"
              required
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-center text-lg tracking-[0.5em] text-neutral-100 outline-none focus:border-neutral-500"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {loading ? 'A verificar…' : 'Entrar'}
            </button>
            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-center text-sm text-neutral-500 hover:text-neutral-300"
            >
              Usar outro e-mail
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
