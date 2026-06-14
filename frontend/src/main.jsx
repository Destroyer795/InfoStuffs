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

// ── Module-level Lie-Fi Detection ──────────────────────────────────
// This MUST run before React renders. The old useEffect-based listener
// lost the race: Clerk's rejection fired during the first render,
// before useEffect had a chance to attach. Moving it here guarantees
// the listener exists before ClerkProvider ever mounts.
let clerkLoadFailed = false
const clerkFailCallbacks = new Set()

window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.message === 'Clerk: Failed to load Clerk') {
    console.warn('Clerk script failed to download due to DNS failure. Forcing Offline Vault.')
    clerkLoadFailed = true
    event.preventDefault()
    // Notify the React component (if it has mounted)
    clerkFailCallbacks.forEach(fn => fn())
  }
})

const InfoStuffsRoot = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine || clerkLoadFailed);

  useEffect(() => {
    // If the user regains internet, reload the page so Clerk can safely boot up
    const handleOnline = () => {
      setIsOffline(false);
      window.location.reload(); 
    };
    const handleOffline = () => setIsOffline(true);

    // Subscribe to module-level Clerk failure signal
    const handleClerkFail = () => setIsOffline(true);
    clerkFailCallbacks.add(handleClerkFail);

    // Check if failure already happened before this effect ran
    if (clerkLoadFailed) setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Timeout fallback: if after 10 seconds we're still in the online
    // branch, probe for real connectivity. Catches edge cases where
    // the rejection event is swallowed entirely.
    let timeoutId;
    if (navigator.onLine && !clerkLoadFailed) {
      timeoutId = setTimeout(() => {
        fetch('https://clients3.google.com/generate_204', {
          mode: 'no-cors',
          cache: 'no-store'
        }).catch(() => {
          console.warn('Lie-Fi detected via timeout probe. Forcing Offline Vault.');
          setIsOffline(true);
        });
      }, 10000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clerkFailCallbacks.delete(handleClerkFail);
      if (timeoutId) clearTimeout(timeoutId);
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
