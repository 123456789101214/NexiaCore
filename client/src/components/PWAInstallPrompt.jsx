import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');
    
    const handleBeforeInstallPrompt = (e) => {
    e.preventDefault();
    setDeferredPrompt(e);
    // Check HERE — not outside
    const hasDismissed = localStorage.getItem('pwa-prompt-dismissed');
    if (!hasDismissed) {
        setShowPrompt(true);
    }
};

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 animate-in slide-in-from-bottom-5">
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-black text-slate-800 dark:text-white mb-1">Install NexiaCore POS</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Install as an app for full-screen experience and faster offline access.</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button onClick={handleInstall} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black py-2.5 rounded-xl transition-colors">
          Install Now
        </button>
        <button onClick={handleDismiss} className="px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-xs font-black rounded-xl transition-colors">
          Not Now
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;