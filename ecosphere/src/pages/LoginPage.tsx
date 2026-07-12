import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { auth, signInWithEmailAndPassword, signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import { Mail, Lock, LogIn } from 'lucide-react';

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
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine redirect page after login
  const from = (location.state as any)?.from?.pathname || '/';

  // Already logged in — redirect instantly
  if (user) {
    return <Navigate to={from} replace />;
  }

  // Google Sign-In handler
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      showToast({ message: 'Signed in with Google successfully!', type: 'success' });
      navigate(from, { replace: true });
    } catch (err: any) {
      showToast({ message: 'Google sign-in failed: ' + err.message, type: 'error' });
    } finally {
      setGoogleLoading(false);
    }
  };

  // Standard Email & Password Sign-In handler
  const handleEmailPasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast({ message: 'Please fill in both email and password.', type: 'warning' });
      return;
    }

    setLoginLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      showToast({ message: 'Welcome back! Signed in successfully.', type: 'success' });
      navigate(from, { replace: true });
    } catch (err: any) {
      showToast({ message: 'Sign-in failed: ' + (err.message || 'Incorrect credentials'), type: 'error' });
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-6 bg-[var(--color-canvas)] text-[var(--color-text-primary)]">
      <Card title="EcoSphere ESG Portal" className="max-w-md w-full relative overflow-hidden elevation-3">
        {/* Decorative glow elements */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[var(--color-brand-glow)] blur-3xl pointer-events-none opacity-40" />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-[rgba(59,130,246,0.1)] blur-2xl pointer-events-none" />

        <div className="flex flex-col gap-5 mt-2 relative">
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            Log in to manage Carbon records, CSR campaigns, policies, and rewards.
          </p>

          {/* ── Google OAuth Button ── */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loginLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border font-semibold text-sm transition-all cursor-pointer hover:shadow-md active:scale-[0.98] disabled:opacity-60 bg-white"
            style={{
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

          {/* ── Email & Password Sign-In Form ── */}
          <form onSubmit={handleEmailPasswordSignIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1 font-semibold">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <input
                    type="email"
                    placeholder="e.g. thiru@ecosphere.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-9"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1 font-semibold flex justify-between">
                  <span>Password</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-[var(--color-text-tertiary)]" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-9"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading || googleLoading}
              className="btn-primary w-full justify-center py-2.5 rounded-xl text-white font-semibold transition-all cursor-pointer disabled:opacity-60"
            >
              <LogIn size={14} />
              {loginLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="text-center mt-1">
            <span className="text-[10px] text-[var(--color-text-tertiary)] italic">
              Demo mode: Try any seeded employee email (e.g. thiru@ecosphere.com) with any password.
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
