import { useEffect, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useAuth, useUser, SignedOut, AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { Box, ThemeProvider, CssBaseline, CircularProgress, Backdrop, Snackbar, Alert } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar.jsx';
import CustomCursor from './components/Cursor.jsx';
import CustomScrollbar from './components/CustomScrollbar.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import VaultAccessDialog from './components/VaultAccessDialog.jsx';
import useVaultSession from './utils/useVaultSession.js';
import { lightTheme, darkTheme } from './theme';

const SplitPaneVault = lazy(() => import('./components/SplitPaneVault.jsx'));
const Create = lazy(() => import('./pages/Create.jsx'));
const UpdateProf = lazy(() => import('./pages/UpdateProf.jsx'));
const Landing = lazy(() => import('./pages/Landing.jsx'));

const LoadingScreen = () => <Backdrop open sx={{ color: 'text.primary', bgcolor: 'background.default', zIndex: (theme) => theme.zIndex.modal + 1 }}><CircularProgress color="inherit" /></Backdrop>;

const App = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('appTheme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const { getToken, isLoaded: authLoaded } = useAuth();
  const { user, isSignedIn, isLoaded: userLoaded } = useUser();
  const notify = useCallback((message, severity = 'info') => setSnackbar({ open: true, message, severity }), []);
  const vault = useVaultSession({ userId: isSignedIn ? user?.id : null, getToken, notify });
  const theme = useMemo(() => darkMode ? darkTheme : lightTheme, [darkMode]);
  useEffect(() => { localStorage.setItem('appTheme', darkMode ? 'dark' : 'light'); }, [darkMode]);
  useEffect(() => { setSearchQuery(''); }, [user?.id, vault.active?.id]);
  const filteredInfos = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return query ? vault.infos.filter((info) => [info.name, info.category, info.content].some((value) => typeof value === 'string' && value.toLowerCase().includes(query))) : vault.infos;
  }, [searchQuery, vault.infos]);
  const closeSnackbar = (_, reason) => { if (reason !== 'clickaway') setSnackbar((previous) => ({ ...previous, open: false })); };
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline /><CustomCursor />
      {(!authLoaded || !userLoaded) && <LoadingScreen />}
      {isSignedIn && userLoaded && !vault.active && <VaultAccessDialog key={user.id} catalog={vault.catalog}
        loading={vault.loading} loadError={vault.loadError} onRetry={vault.reload} onActivate={vault.activate} onReset={vault.reset}
        onOpenOffline={() => window.dispatchEvent(new Event('infostuffs:open-offline'))} />}
      <Snackbar open={snackbar.open} autoHideDuration={7000} onClose={closeSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>{snackbar.message}</Alert>
      </Snackbar>
      <Router>
        <AppContent infos={vault.infos} filteredInfos={filteredInfos} handleCreate={vault.createInfo} handleUpdate={vault.updateInfo}
          handleDelete={vault.deleteInfo} darkMode={darkMode} toggleDarkMode={() => setDarkMode((previous) => !previous)}
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} isVaultUnlocked={!!vault.active} userKey={vault.active?.key}
          vaultId={vault.active?.id} vaultName={vault.active?.name} onLockVault={vault.lock} />
      </Router>
    </ThemeProvider>
  );
};

function AppContent({
  infos, filteredInfos, handleUpdate, handleDelete, handleCreate, darkMode,
  toggleDarkMode,
  searchQuery, setSearchQuery, isVaultUnlocked, userKey, vaultId, vaultName, onLockVault
}) {
  const location = useLocation();
  const { isSignedIn, isLoaded } = useUser();
  const hideNav = ['/login', '/signup', '/'].includes(location.pathname) || !isLoaded || !isSignedIn;

  return (
    <Box>
      <CustomScrollbar global={true} watch={location.pathname} />
      {!hideNav && (
        <>
          <NavBar darkMode={darkMode} toggleDarkMode={toggleDarkMode} vaultName={vaultName} onLockVault={onLockVault} />
        </>
      )}
      <Suspense fallback={<LoadingScreen darkMode={darkMode} />}>
        <Routes>
          <Route 
             path="/sso-callback" 
             element={
               <>
                 <LoadingScreen darkMode={darkMode} />
                 <AuthenticateWithRedirectCallback 
                   signInForceRedirectUrl="/dashboard" 
                   signUpForceRedirectUrl="/dashboard" 
                 />
               </>
             } 
          />
          
          <Route
            path="/login"
            element={
              !isLoaded ? (
                <LoadingScreen darkMode={darkMode} />
              ) : isSignedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <SignedOut><Login /></SignedOut>
              )
            }
          />
          <Route
            path="/signup"
            element={
              !isLoaded ? (
                <LoadingScreen darkMode={darkMode} />
              ) : isSignedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <SignedOut><Signup /></SignedOut>
              )
            }
          />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                {isVaultUnlocked && (
                  <SplitPaneVault
                    infos={filteredInfos}
                    allInfos={infos}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    userKey={userKey}
                    vaultId={vaultId}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                  />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/create"
            element={
              <ProtectedRoute>
                {isVaultUnlocked && <Create key={vaultId} handleCreate={handleCreate} userKey={userKey} vaultId={vaultId} />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/update-profile"
            element={
              <ProtectedRoute>
                <UpdateProf />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              !isLoaded ? (
                <LoadingScreen darkMode={darkMode} />
              ) : isSignedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Landing darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
              )
            }
          />
        </Routes>
      </Suspense>
    </Box>
  );
}

export default App;
