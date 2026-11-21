import { useState } from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, Divider,
  IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material';
import { Add, ArrowBack, LockOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import useVaultWorker from '../utils/useVaultWorker.js';

const resetButtonStyle = {
  border: '2px solid currentColor',
  color: 'text.primary',
  transition: 'background-color 180ms ease, transform 120ms ease',
  '&:hover': {
    backgroundColor: 'error.dark',
    color: 'text.primary',
    boxShadow: 'none',
    transform: 'none',
  },
  '&:active': {
    transform: 'scale(0.98) !important',
  },
};

export default function VaultAccessDialog({ catalog, loading, loadError, onRetry, onActivate, onReset,
  offline = false, onOpenOffline }) {
  const [mode, setMode] = useState('unlock');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [name, setName] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [matches, setMatches] = useState([]);
  const { run } = useVaultWorker();
  const empty = !catalog?.vaults.length && !catalog?.legacyNotes.length;
  const back = () => { setMode('unlock'); setPassword(''); setConfirmation(''); setError(''); setMatches([]); setVisible(false); };
  const create = () => { back(); setMode('create'); };
  const report = (failure) => { if (failure.name !== 'AbortError') setError(failure.response?.data?.message || failure.message || 'Please retry.'); };

  const activate = async (match) => {
    setBusy(true); setError(''); setPassword(''); setConfirmation(''); setVisible(false);
    try { await onActivate(match); }
    catch (failure) { setMatches([match]); setMode('choose'); report(failure); }
    finally { setBusy(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy || loading || loadError) return;
    setError('');
    if (mode === 'create' && password !== confirmation) { setError('The passwords do not match. Please try again.'); return; }
    setBusy(true);
    try {
      if (mode === 'create') {
        const result = await run({ action: 'create', password, name });
        await activate({ ...result.vault, newVault: true });
      } else {
        const result = await run({ action: 'unlock', password, userId: catalog.userId,
          vaults: catalog.vaults, legacyNotes: catalog.legacyNotes });
        setPassword(''); setVisible(false);
        if (!result.matches.length) setMode('unrecognized');
        else if (result.matches.length === 1) await activate(result.matches[0]);
        else { setMatches(result.matches); setMode('choose'); }
      }
    } catch (failure) { report(failure); }
    finally { setBusy(false); }
  };

  const passwordField = (label, value, onChange, confirm = false) => (
    <TextField fullWidth required label={label} type={visible ? 'text' : 'password'} value={value}
      autoComplete={mode === 'create' ? 'new-password' : 'current-password'} autoFocus={!confirm && mode !== 'create'}
      disabled={busy} onChange={(event) => onChange(event.target.value)}
      slotProps={{ htmlInput: { minLength: mode === 'create' ? 12 : 1, maxLength: 1024 }, input: { endAdornment: !confirm && (
        <InputAdornment position="end"><IconButton aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((value) => !value)} edge="end">{visible ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>
      ) } }} />
  );

  return (
    <Dialog open fullWidth maxWidth="sm" disableEscapeKeyDown aria-labelledby="vault-access-title"
      slotProps={{ paper: { sx: { p: { xs: 0.5, sm: 2 } } } }}>
      <DialogTitle id="vault-access-title" sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
          <Box sx={{ border: '2px solid', borderColor: 'text.primary', borderRadius: 2, p: 1, display: 'flex' }}><LockOutlined /></Box>
          <Typography component="span" variant="overline" sx={{ fontWeight: 800, letterSpacing: 2 }}>{offline ? 'OFFLINE ACCESS' : 'YOUR PRIVATE SPACE'}</Typography>
        </Stack>
        <Typography component="span" variant="h5" sx={{ display: 'block', fontWeight: 800 }}>
          {mode === 'create' ? 'Create a separate vault' : mode === 'unrecognized' ? 'Password not recognized' :
            mode === 'choose' ? 'Choose your vault' : mode === 'reset' ? 'Reset all vaults' : empty && !loading && !loadError ? 'Welcome to your vault' : 'Unlock your vault'}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 1 }}>
          {loading ? <Stack alignItems="center" spacing={2} sx={{ py: 3 }}><CircularProgress size={28} /><Typography>Loading encrypted vault information...</Typography></Stack> : loadError ? <>
            <Alert severity="error">{loadError}</Alert>
            <Button variant="contained" onClick={onRetry}>Retry connection</Button>
            {onOpenOffline && <Button variant="outlined" onClick={onOpenOffline}>Open cached vaults offline</Button>}
          </> : <>
            {error && <Alert severity="error" role="alert">{error}</Alert>}
            {busy && <Stack direction="row" spacing={1.5} alignItems="center" role="status"><CircularProgress size={20} /><Typography variant="body2">Verifying securely on this device...</Typography></Stack>}
            {mode === 'unrecognized' ? <>
              <Typography color="text.secondary">This password did not unlock a vault. Check for a typo, or create a separate vault intentionally. Existing content stays in its current vault.</Typography>
              <Button autoFocus variant="contained" onClick={back}>Try again</Button>
              {!offline && <Button variant="outlined" startIcon={<Add />} onClick={create}>Create another vault</Button>}
            </> : mode === 'choose' ? <>
              <Typography color="text.secondary">Select a vault verified with your password. Names are decrypted only on this device.</Typography>
              {matches.map((match) => <Button key={match.metadata.id} variant="outlined" disabled={busy} startIcon={<LockOutlined />}
                onClick={() => activate(match)} sx={{ justifyContent: 'flex-start', py: 1.5, overflowWrap: 'anywhere' }}>{match.name}</Button>)}
              <Button startIcon={<ArrowBack />} disabled={busy} onClick={back}>Use another password</Button>
            </> : mode === 'reset' ? <>
              <Alert severity="warning">This permanently deletes every vault, note and attachment in this account. A new vault does not require a reset.</Alert>
              <TextField fullWidth label="Type RESET ALL to confirm" value={confirmation} disabled={busy} onChange={(event) => setConfirmation(event.target.value)} />
              <Button color="error" variant="contained" sx={resetButtonStyle} disabled={busy || confirmation !== 'RESET ALL'} onClick={async () => {
                setBusy(true); setError('');
                try { await onReset(); back(); } catch (failure) { report(failure); } finally { setBusy(false); }
              }}>Permanently reset all vaults</Button>
              <Button disabled={busy} onClick={back}>Cancel</Button>
            </> : mode === 'create' || !empty ? <Box component="form" onSubmit={submit}>
              <Stack spacing={2.5}>
                <Typography color="text.secondary">{mode === 'create' ? 'Give this vault its own name and password. Save the password somewhere safe. We cannot recover it.' : 'Your password unlocks your encryption key in this browser. It is never sent to our server.'}</Typography>
                {mode === 'create' && <TextField fullWidth required autoFocus label="Vault name" value={name} disabled={busy} slotProps={{ htmlInput: { maxLength: 120 } }} onChange={(event) => setName(event.target.value)} helperText="Your vault name is encrypted too." />}
                {passwordField(mode === 'create' ? 'New vault password' : 'Master password', password, setPassword)}
                {mode === 'create' && passwordField('Confirm vault password', confirmation, setConfirmation, true)}
                {mode === 'create' && <Typography variant="caption" color="text.secondary">Use at least 12 characters. A long, unique passphrase helps protect against offline password guessing.</Typography>}
                <Button type="submit" variant="outlined" size="large" disabled={busy || !password || (mode === 'create' && (!name.trim() || !confirmation))}>{mode === 'create' ? 'Create vault' : 'Unlock vault'}</Button>
                {mode === 'create' ? <Button disabled={busy} startIcon={<ArrowBack />} onClick={back}>Back to unlock</Button> : !offline && <Button variant="outlined" disabled={busy} startIcon={<Add />} onClick={create}>Create another vault</Button>}
              </Stack>
            </Box> : <>
              <Typography color="text.secondary">Create your first vault with a password you will remember. Your notes and files are encrypted before they leave this device.</Typography>
              {!offline && <Button variant="contained" startIcon={<Add />} onClick={create}>Create your first vault</Button>}
              {offline && <Alert severity="info">No vault has been cached on this device. Connect to the internet and unlock a vault first.</Alert>}
            </>}
            {!offline && onReset && mode === 'unlock' && !empty && <><Divider /><Button size="small" color="inherit" disabled={busy} sx={{ alignSelf: 'center', color: 'text.secondary' }} onClick={() => { setConfirmation(''); setMode('reset'); setPassword(''); }}>Forgot your password? Reset all vaults</Button></>}
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>Encrypted on your device. Passwords and unlocked keys stay here.</Typography>
          </>}
          {offline && <Button variant="outlined" onClick={() => window.location.reload()}>Reconnect online</Button>}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
