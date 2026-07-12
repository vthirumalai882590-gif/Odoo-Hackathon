import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, isSignInWithEmailLink, signInWithEmailLink } from '../lib/firebase';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import { Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';

export default function FinishLogin() {
  const [status, setStatus] = useState('Verifying your passwordless security link...');
  const [error, setError] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const completeLogin = async () => {
      if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');

        if (!email) {
          email = window.prompt('Please confirm your corporate email address:');
        }

        if (!email) {
          setStatus('Authentication aborted: corporate email check is required.');
          setError(true);
          return;
        }

        try {
          setStatus('Authenticating credentials...');
          await signInWithEmailLink(auth, email, window.location.href);
          
          window.localStorage.removeItem('emailForSignIn');
          window.localStorage.removeItem('mockSignInLink');
          
          showToast({ message: 'Welcome back! Logged in successfully.', type: 'success' });
          
          setTimeout(() => {
            navigate('/');
          }, 1500);
        } catch (err: any) {
          setStatus('Authentication error: ' + err.message);
          setError(true);
          showToast({ message: 'Sign-in failed: ' + err.message, type: 'error' });
        }
      } else {
        setStatus('Invalid sign-in link. Please request a new link.');
        setError(true);
      }
    };

    completeLogin();
  }, [navigate, showToast]);

  return (
    <div className="min-h-screen w-screen flex items-center justify-center p-6 bg-[var(--color-canvas)] text-[var(--color-text-primary)]">
      <Card title="Secure Access Verification" className="max-w-md w-full text-center elevation-3">
        <div className="flex flex-col gap-4 py-6 items-center animate-fade-in">
          {error ? (
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-[var(--color-diff-hard)] mb-1">
              <ShieldAlert size={24} />
            </div>
          ) : status.includes('Authenticating') ? (
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-[var(--color-brand-400)] mb-1">
              <ShieldCheck size={24} />
            </div>
          ) : (
            <Loader2 className="w-8 h-8 text-[var(--color-brand-400)] animate-spin mb-2" />
          )}
          
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed max-w-xs">
            {status}
          </p>
        </div>
      </Card>
    </div>
  );
}
