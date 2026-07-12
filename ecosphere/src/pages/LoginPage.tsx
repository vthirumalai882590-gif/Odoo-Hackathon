import { useState } from 'react';
import { auth, sendSignInLinkToEmail } from '../lib/firebase';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import { Mail, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [mockLink, setMockLink] = useState<string | null>(null);
  const { showToast } = useToast();

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
      
      // Pull mock link from localStorage if running in local fallback mode
      const savedLink = window.localStorage.getItem('mockSignInLink');
      if (savedLink) {
        setMockLink(savedLink);
      }
    } catch (err: any) {
      showToast({ message: 'Failed to authenticate: ' + err.message, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-6 bg-[var(--color-canvas)] text-[var(--color-text-primary)]">
      <Card title="EcoSphere ESG Portal" className="max-w-md w-full relative overflow-hidden elevation-3">
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[var(--color-brand-glow)] blur-2xl pointer-events-none" />

        {!sent ? (
          <form onSubmit={handleSendLink} className="flex flex-col gap-4 mt-2">
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Authenticate securely using a passwordless email verification link. Provide your email below to start.
            </p>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)] mb-1 font-semibold">
                Corporate Email Address
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
            
            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5 mt-2 rounded-xl text-white font-semibold transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              Send Secure Link
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4 text-center py-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[var(--color-brand-glow)] flex items-center justify-center text-[var(--color-brand-400)] mx-auto mb-2">
              <Mail size={24} />
            </div>
            <h4 className="font-semibold text-lg text-[var(--color-text-primary)]">Check Your Inbox</h4>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed max-w-sm mx-auto">
              We sent a passwordless authentication link to <strong className="text-[var(--color-text-primary)]">{email}</strong>.
            </p>

            {mockLink && (
              <div className="mt-4 p-4 rounded-xl border bg-[var(--color-surface-3)] border-[var(--color-surface-border)] text-left flex flex-col gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-xp-gold)]">
                  <AlertCircle size={14} />
                  <span>Local Mock Link Simulator</span>
                </div>
                <p className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed">
                  You are in offline demo mode. Click the button below to simulate clicking the magic link inside your email.
                </p>
                <a
                  href={mockLink}
                  className="btn-primary justify-center text-xs py-2 text-center rounded-lg text-ink font-bold font-mono transition-colors"
                  style={{ background: 'var(--color-xp-gold)', boxShadow: '0 2px 8px var(--color-xp-glow)' }}
                >
                  Simulate Email Click
                </a>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
