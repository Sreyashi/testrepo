import { useState } from 'react';
import {
  Brain,
  Mail,
  User,
  Link,
  Copy,
  Check,
  LogIn,
  ArrowRight,
  Shield,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

type Tab = 'create' | 'signin';

export default function LoginPage() {
  const { register, loginWithToken } = useAuth();

  const [tab, setTab] = useState<Tab>('create');

  // Create-account form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [nameErr, setNameErr] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Sign-in form
  const [pastedLink, setPastedLink] = useState('');
  const [signinErr, setSigninErr] = useState('');

  const validateEmail = (e: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleCreate = () => {
    setNameErr('');
    setEmailErr('');
    let valid = true;

    if (!name.trim()) { setNameErr('Please enter your name.'); valid = false; }
    if (!validateEmail(email)) { setEmailErr('Please enter a valid email address.'); valid = false; }
    if (!valid) return;

    const result = register(name, email);
    setGeneratedLink(result.magicLink);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSignIn = () => {
    setSigninErr('');
    const input = pastedLink.trim();
    if (!input) { setSigninErr('Please paste your login link or token.'); return; }

    // Accept both full URL and bare token
    let token = input;
    try {
      const url = new URL(input);
      const t = url.searchParams.get('token');
      if (t) token = t;
    } catch {
      // not a URL — treat as raw token
    }

    const ok = loginWithToken(token);
    if (!ok) setSigninErr('Link not recognised. Make sure you copied the full link.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex flex-col items-center justify-center px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200 mb-5">
          <Brain size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">ADHD Behavioral Tracker</h1>
        <p className="text-slate-500 mt-2 max-w-sm mx-auto">
          Daily tracking for parents — share progress directly with your therapist.
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-100">
          <TabBtn active={tab === 'create'} onClick={() => setTab('create')} icon={<Sparkles size={15} />}>
            Create Account
          </TabBtn>
          <TabBtn active={tab === 'signin'} onClick={() => setTab('signin')} icon={<LogIn size={15} />}>
            Sign In
          </TabBtn>
        </div>

        <div className="p-7">
          {tab === 'create' ? (
            generatedLink ? (
              /* ── Magic link revealed ── */
              <LinkReveal
                link={generatedLink}
                copied={copiedLink}
                onCopy={copyLink}
                onReset={() => { setGeneratedLink(''); setName(''); setEmail(''); }}
              />
            ) : (
              /* ── Sign-up form ── */
              <div className="space-y-5">
                <p className="text-sm text-slate-500">
                  Create your account and receive a personal magic link — no password ever needed.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your Name</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={e => { setName(e.target.value); setNameErr(''); }}
                      placeholder="e.g. Jamie Williams"
                      className={`form-input pl-9 ${nameErr ? 'border-red-300' : ''}`}
                    />
                  </div>
                  {nameErr && <p className="text-xs text-red-500 mt-1">{nameErr}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setEmailErr(''); }}
                      placeholder="you@email.com"
                      className={`form-input pl-9 ${emailErr ? 'border-red-300' : ''}`}
                      onKeyDown={e => e.key === 'Enter' && handleCreate()}
                    />
                  </div>
                  {emailErr && <p className="text-xs text-red-500 mt-1">{emailErr}</p>}
                </div>

                <button
                  onClick={handleCreate}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow shadow-indigo-200 transition"
                >
                  Generate My Login Link <ArrowRight size={16} />
                </button>

                <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1">
                  <Shield size={12} /> Your link is the only thing needed to access your data.
                </p>
              </div>
            )
          ) : (
            /* ── Sign-in form ── */
            <div className="space-y-5">
              <p className="text-sm text-slate-500">
                Paste your personal login link to access your account. Each account has a unique link.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your Login Link</label>
                <div className="relative">
                  <Link size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={pastedLink}
                    onChange={e => { setPastedLink(e.target.value); setSigninErr(''); }}
                    placeholder="http://…?token=…"
                    className={`form-input pl-9 font-mono text-xs ${signinErr ? 'border-red-300' : ''}`}
                    onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                  />
                </div>
                {signinErr && <p className="text-xs text-red-500 mt-1">{signinErr}</p>}
              </div>

              <button
                onClick={handleSignIn}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow shadow-indigo-200 transition"
              >
                <LogIn size={16} /> Sign In
              </button>

              <p className="text-xs text-slate-400 text-center">
                Don't have a link?{' '}
                <button
                  onClick={() => setTab('create')}
                  className="text-indigo-500 hover:text-indigo-700 font-medium transition"
                >
                  Create an account
                </button>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-3 mt-8">
        {[
          '🔒 No passwords',
          '📊 Progress charts',
          '📋 Therapist reports',
          '👨‍👩‍👧 Multi-child support',
        ].map(f => (
          <span key={f} className="bg-white border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-full shadow-sm">
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TabBtn({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition border-b-2 ${
        active
          ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
          : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
      }`}
    >
      {icon} {children}
    </button>
  );
}

function LinkReveal({
  link,
  copied,
  onCopy,
  onReset,
}: {
  link: string;
  copied: boolean;
  onCopy: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
        <Check size={28} className="text-emerald-600" />
      </div>

      <div>
        <h3 className="font-bold text-slate-800 text-lg">Your login link is ready!</h3>
        <p className="text-sm text-slate-500 mt-1">
          Save this link — it's the only way to access your account. We recommend bookmarking it or saving it in a notes app.
        </p>
      </div>

      {/* Link display */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <p className="font-mono text-xs text-slate-600 break-all leading-relaxed">{link}</p>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={onCopy}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow shadow-indigo-200'
          }`}
        >
          {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Login Link</>}
        </button>

        <button
          onClick={onCopy}
          className="w-full text-center text-xs text-slate-400 py-1 hover:text-slate-600 transition"
        >
          The app will open with your account automatically logged in when you visit this link.
        </button>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition mx-auto"
        >
          <RefreshCw size={13} /> Create another account
        </button>
      </div>
    </div>
  );
}
