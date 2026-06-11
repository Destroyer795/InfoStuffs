import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { darkTheme } from './theme'
import OfflineVault from './pages/OfflineVault.jsx'

// Register the service worker immediately for offline support
registerSW({ immediate: true })

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkKey) {
  throw new Error('Missing Clerk publishable key')
}

const InfoStuffsRoot = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // If the user regains internet, reload the page so Clerk can safely boot up
    const handleOnline = () => {
      setIsOffline(false);
      window.location.reload(); 
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // If offline, DO NOT render Clerk. Render the secure local vault instead.
  if (isOffline) {
    return (
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <OfflineVault />
      </ThemeProvider>
    );
  }

  // If online, render the normal app tree
  return (
    <ClerkProvider
      publishableKey={clerkKey}
      signInUrl="/login"
      signUpUrl="/signup"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <App />
    </ClerkProvider>
  );
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <InfoStuffsRoot />
  </StrictMode>
)
