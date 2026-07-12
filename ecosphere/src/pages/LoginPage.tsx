import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, sendSignInLinkToEmail, signInWithGoogle } from '../lib/firebase';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import { Mail, Sparkles, AlertCircle } from 'lucide-react';

// Google G SVG icon
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [mockLink, setMockLink] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Google Sign-In handler
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      showToast({ message: 'Signed in with Google successfully!', type: 'success' });
      navigate('/');
    } catch (err: any) {
      showToast({ message: 'Google sign-in failed: ' + err.message, type: 'error' });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Passwordless email link handler
  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const actionCodeSettings = {
      url: `${window.location.origin}/finish-login`,
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setSent(true);
      showToast({ message: 'Authentication link created successfully.', type: 'success' });

      const savedLink = window.localStorage.getItem('mockSignInLink');
      if (savedLink) setMockLink(savedLink);
    } catch (err: any) {
      showToast({ message: 'Failed to send link: ' + err.message, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-6 bg-[var(--color-canvas)] text-[var(--color-text-primary)]">
      <Card title="EcoSphere ESG Portal" className="max-w-md w-full relative overflow-hidden elevation-3">
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[var(--color-brand-glow)] blur-3xl pointer-events-none opacity-40" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-[rgba(59,130,246,0.1)] blur-2xl pointer-events-none" />

        {!sent ? (
          <div className="flex flex-col gap-5 mt-2 relative">
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Sign in to your ESG management platform. Use your Google account for the fastest access.
            </p>

            {/* ── Google OAuth Button ── */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all cursor-pointer hover:shadow-md active:scale-[0.98] disabled:opacity-60"
              style={{
                background: 'white',
                color: '#1f1f1f',
                borderColor: '#dadce0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
              }}
            >
              <GoogleIcon />
              {googleLoading ? 'Connecting...' : 'Continue with Google'}
            </button>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[var(--color-surface-border)]" />
              <span className="text-[11px] text-[var(--color-text-tertiary)] font-medium uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-[var(--color-surface-border)]" />
            </div>

            {/* ── Passwordless Email Link ── */}
            <form onSubmit={handleSendLink} className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1 font-semibold">
                  Passwordless Email Link
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <input
                    type="email"
                    placeholder="e.g. you@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-9"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5 rounded-xl text-white font-semibold transition-all cursor-pointer"
              >
                <Sparkles size={14} />
                Send Magic Link
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-4 text-center py-4 animate-fade-in relative">
            <div className="w-12 h-12 rounded-full bg-[var(--color-brand-glow)] flex items-center justify-center text-[var(--color-brand-400)] mx-auto mb-2">
              <Mail size={24} />
            </div>
            <h4 className="font-semibold text-lg text-[var(--color-text-primary)]">Check Your Inbox</h4>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-sm mx-auto">
              We sent a passwordless link to <strong className="text-[var(--color-text-primary)]">{email}</strong>.
            </p>

            {mockLink && (
              <div className="mt-4 p-4 rounded-xl border bg-[var(--color-surface-3)] border-[var(--color-surface-border)] text-left flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-xp-gold)]">
                  <AlertCircle size={14} />
                  <span>Local Mock Link Simulator</span>
                </div>
                <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
                  You are running in offline demo mode. Click below to simulate clicking the secure link in your email.
                </p>
                <a
                  href={mockLink}
                  className="w-full text-center text-xs py-2 rounded-lg font-bold transition-colors"
                  style={{
                    background: 'var(--color-xp-gold)',
                    color: 'var(--color-canvas)',
                    boxShadow: '0 2px 8px var(--color-xp-glow)',
                  }}
                >
                  ✉️ Simulate Email Click
                </a>
              </div>
            )}

            <button
              onClick={() => { setSent(false); setMockLink(null); }}
              className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer mt-2"
            >
              ← Back to sign-in options
            </button>
          </div>
        )}
      </Card>
    </div>
  );
}
