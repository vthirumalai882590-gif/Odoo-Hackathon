import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function useKeyboardShortcuts(onShowHelp?: () => void) {
  const navigate = useNavigate();

  useEffect(() => {
    let keyBuffer = '';
    let timer: any;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if user is typing in form controls
      const activeEl = document.activeElement as HTMLElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.contentEditable === 'true')
      ) {
        return;
      }

      // 1. Search focus helper
      if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"], input[placeholder*="filter"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
        return;
      }

      // 2. Help dialog trigger
      if (e.key === '?') {
        e.preventDefault();
        onShowHelp?.();
        return;
      }

      // 3. Navigation sequence logic (g then d/e/s/o/g/r/c)
      if (e.key.toLowerCase() === 'g') {
        keyBuffer = 'g';
        clearTimeout(timer);
        timer = setTimeout(() => {
          keyBuffer = '';
        }, 1000); // 1-second timeout buffer
        return;
      }

      if (keyBuffer === 'g') {
        const command = e.key.toLowerCase();
        let targetPath = '';

        switch (command) {
          case 'd':
            targetPath = '/';
            break;
          case 'e':
            targetPath = '/environmental';
            break;
          case 's':
            targetPath = '/social';
            break;
          case 'o': // governance
            targetPath = '/governance';
            break;
          case 'g': // gamification
            targetPath = '/gamification';
            break;
          case 'r': // reports
            targetPath = '/reports';
            break;
          case 'c': // config (settings)
            targetPath = '/settings';
            break;
        }

        if (targetPath) {
          e.preventDefault();
          navigate(targetPath);
        }

        keyBuffer = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [navigate, onShowHelp]);
}
