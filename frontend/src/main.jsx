import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.jsx'

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkKey) {
  throw new Error('Missing Clerk publishable key')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={clerkKey}
      signInUrl="/login"
      signUpUrl="/signup"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
    >
      <App />
    </ClerkProvider>
  </StrictMode>
)
