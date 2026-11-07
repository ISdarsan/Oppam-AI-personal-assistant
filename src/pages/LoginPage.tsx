import React, { useState } from 'react';
import { HeartHandshake, HandHeart, Users, UserRound } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { BigButton } from '../components/ui/BigButton';
import { Logo } from '../components/ui/Logo';
import { ApiError } from '../services/api';
import { Role } from '../types/community';

const DEMO_NAMES: Record<Role, { ml: string; en: string }> = {
  senior: { ml: 'ലക്ഷ്മി അമ്മ', en: 'Lakshmi Amma' },
  helper: { ml: 'അനിൽ', en: 'Anil' },
  family: { ml: 'മീര', en: 'Meera' },
};

export const LoginPage: React.FC = () => {
  const { tx, language } = useLanguage();
  const { login } = useAuth();
  const [role, setRole] = useState<Role>('senior');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles: { id: Role; title: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'senior', title: tx('roleSenior'), desc: tx('roleSeniorDesc'), icon: <UserRound className="w-9 h-9" aria-hidden="true" /> },
    { id: 'helper', title: tx('roleHelper'), desc: tx('roleHelperDesc'), icon: <HandHeart className="w-9 h-9" aria-hidden="true" /> },
    { id: 'family', title: tx('roleFamily'), desc: tx('roleFamilyDesc'), icon: <Users className="w-9 h-9" aria-hidden="true" /> },
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || DEMO_NAMES[role][language === 'ml' ? 'ml' : 'en'];
    setBusy(true);
    setError(null);
    try {
      await login(finalName, role);
    } catch (err) {
      setError(err instanceof ApiError && err.code !== 'CONNECTION_ERROR' ? err.message : tx('offlineHint'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-ivory px-4 py-6 sm:py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <span className="text-2xl font-bold text-brand-forest">ഒപ്പം</span>
          </div>
          <LanguageSwitcher />
        </div>

        <div className="animate-riseIn">
          <HeartHandshake className="w-10 h-10 text-brand-coral mb-3" aria-hidden="true" />
          <h1 className="text-3xl sm:text-4xl font-bold text-brand-ink leading-snug">{tx('tagline')}</h1>
          <p className="mt-3 text-lg text-brand-muted">{tx('loginSubtitle')}</p>
        </div>

        <form onSubmit={submit} className="mt-8 space-y-6" aria-describedby="demo-note">
          <fieldset>
            <legend className="text-xl font-bold text-brand-ink mb-3">{tx('loginTitle')}</legend>
            <div className="grid gap-3">
              {roles.map((r) => {
                const active = role === r.id;
                return (
                  <label
                    key={r.id}
                    className={`flex items-center gap-4 rounded-3xl border-2 p-4 min-h-[84px] cursor-pointer transition-colors focus-within:outline focus-within:outline-4 focus-within:outline-brand-coral ${
                      active ? 'border-brand-forest bg-white shadow-md' : 'border-brand-line bg-white/70 hover:border-brand-sageDark'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.id}
                      checked={active}
                      onChange={() => setRole(r.id)}
                      className="sr-only"
                    />
                    <span
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
                        active ? 'bg-brand-forest text-white' : 'bg-brand-sage text-brand-forest'
                      }`}
                    >
                      {r.icon}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xl font-bold text-brand-ink">{r.title}</span>
                      <span className="block text-base text-brand-muted">{r.desc}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor="login-name" className="block text-xl font-bold text-brand-ink mb-2">
              {tx('yourName')}
            </label>
            <input
              id="login-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="name"
              placeholder={DEMO_NAMES[role][language === 'ml' ? 'ml' : 'en']}
              className="w-full min-h-[56px] rounded-2xl border-2 border-brand-line bg-white px-4 text-xl text-brand-ink placeholder:text-brand-muted/70 focus:border-brand-forest"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-2xl bg-brand-sosSoft border-2 border-brand-sos px-4 py-3 text-lg text-brand-sos font-semibold">
              {error}
            </p>
          )}

          <BigButton type="submit" full loading={busy} variant="forest">
            {tx('enter')}
          </BigButton>
          <p id="demo-note" className="text-center text-base text-brand-muted">
            {tx('demoNote')}
          </p>
        </form>
      </div>
    </div>
  );
};
