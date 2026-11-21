// Development-only fixture. Every API request is intercepted in memory, without Clerk or cloud services.
import { useCallback, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Alert, Box, Button, CssBaseline, Stack, ThemeProvider, Typography } from '@mui/material';
import axios from 'axios';
import VaultAccessDialog from '../../src/components/VaultAccessDialog.jsx';
import OfflineVault from '../../src/pages/OfflineVault.jsx';
import useVaultSession from '../../src/utils/useVaultSession.js';
import { clearOfflineVault } from '../../src/utils/localStore.js';
import { generateKeyFromPassword, encryptText } from '../../src/utils/encryption.js';
import { darkTheme, lightTheme } from '../../src/theme.js';

const params = new URLSearchParams(location.search);
const state = { vaults: [], notes: [], requests: [], failCatalog: params.has('fail'), failCreationOnce: params.has('interrupt'), delayNotes: false };
window.__vaultFixture = state;
const owner = 'fixture-alice';
if (params.has('legacy')) {
  for (const [index, password] of ['old-pass', 'other-old-pass'].entries()) {
    const key = await generateKeyFromPassword(password, owner);
    state.notes.push({ _id: `00000000000000000000000${index}`, userId: owner, vaultId: null, type: 'text', importance: 'High',
      name: await encryptText(`Historic note ${index + 1}`, key), category: await encryptText('Historic category', key), content: await encryptText(`Historic content ${index + 1}`, key) });
  }
  state.originalNotes = structuredClone(state.notes);
}

axios.defaults.adapter = async (request) => {
  const path = new URL(request.url, location.origin).pathname;
  const body = typeof request.data === 'string' ? JSON.parse(request.data) : request.data || {};
  state.requests.push({ path, method: request.method, body: structuredClone(body) });
  const failure = (message) => { const error = new Error(message); error.response = { data: { message }, status: 503 }; throw error; };
  if (request.headers.Authorization !== 'Bearer fixture-token') failure('Fixture authorization failed.');
  let data;
  if (path === '/api/vaults' && request.method === 'get') {
    if (state.failCatalog) failure('Encrypted vault service is unavailable.');
    data = state.vaults;
  } else if (path === '/api/vaults' && request.method === 'post') {
    const { legacyInfoIds = [], ...metadata } = body;
    if (!state.vaults.some((vault) => vault.id === metadata.id)) state.vaults.push(metadata);
    for (const note of state.notes) if (legacyInfoIds.includes(note._id) && !note.vaultId) note.vaultId = metadata.id;
    if (state.failCreationOnce) { state.failCreationOnce = false; failure('The response was interrupted. Retry this vault.'); }
    data = metadata;
  } else if (path.endsWith('/adopt-legacy')) {
    const vaultId = path.split('/')[3];
    for (const note of state.notes) if (body.legacyInfoIds.includes(note._id) && !note.vaultId) note.vaultId = vaultId;
  } else if (path === '/api/info' && request.method === 'get') {
    if (state.delayNotes && request.params?.vaultId) await new Promise((resolve) => { state.releaseNotes = resolve; });
    data = state.notes.filter((note) => (note.vaultId || null) === (request.params?.vaultId || null));
  } else if (path === '/api/info' && request.method === 'post') {
    data = { ...body, _id: crypto.randomUUID(), userId: owner, createdAt: new Date().toISOString() };
    state.notes.unshift(data);
  } else if (path === '/api/info/nuke') {
    state.notes = []; state.vaults = [];
  } else if (path.startsWith('/api/info/') && request.method === 'patch') {
    const id = path.split('/').pop();
    const index = state.notes.findIndex((note) => note._id === id);
    state.notes[index] = { ...state.notes[index], ...body };
    data = state.notes[index];
  } else if (path.startsWith('/api/info/') && request.method === 'delete') {
    state.notes = state.notes.filter((note) => note._id !== path.split('/').pop());
  } else failure(`Unexpected fixture request: ${path}`);
  return { status: 200, statusText: 'OK', headers: {}, config: request, data: { success: true, data: structuredClone(data) } };
};

const getToken = async () => 'fixture-token';
function Harness() {
  const [userId, setUserId] = useState(owner);
  const [message, setMessage] = useState('');
  const notify = useCallback((value) => setMessage(value), []);
  const vault = useVaultSession({ userId, getToken, notify });
  window.__setFixtureUser = setUserId;
  return <Box sx={{ p: 4 }}>
    <Typography variant="h4">InfoStuffs</Typography>
    {message && <Alert>{message}</Alert>}
    {userId && !vault.active && <VaultAccessDialog key={userId} catalog={vault.catalog} loading={vault.loading}
      loadError={vault.loadError} onRetry={vault.reload} onActivate={vault.activate} onReset={vault.reset} />}
    {vault.active && <Stack spacing={2} sx={{ maxWidth: 600, mt: 3 }}>
      <Typography component="h1" variant="h5">{vault.active.name}</Typography>
      <Button variant="outlined" onClick={vault.lock}>Lock and switch vaults</Button>
      <Button variant="contained" onClick={() => vault.createInfo({ name: 'Synthetic private title', category: 'Synthetic private category', type: 'text', content: 'Synthetic private content', importance: 'High' }).catch((error) => setMessage(error.message))}>Save sample note</Button>
      {vault.infos.map((note) => <Box key={note._id}><Typography>{note.name}</Typography><Typography>{note.content}</Typography>
        <Button onClick={() => vault.updateInfo(note._id, { ...note, content: 'Updated synthetic private content' })}>Edit sample</Button>
        <Button onClick={() => vault.deleteInfo(note._id)}>Delete sample</Button></Box>)}
      <Button onClick={async () => { window.dispatchEvent(new Event('infostuffs:lock')); await clearOfflineVault(); setUserId(null); }}>Sign out fixture</Button>
    </Stack>}
    {!userId && <Typography>Fixture signed out</Typography>}
  </Box>;
}

createRoot(document.getElementById('root')).render(<ThemeProvider theme={params.get('theme') === 'light' ? lightTheme : darkTheme}><CssBaseline />
  {params.get('view') === 'offline' ? <OfflineVault /> : <Harness />}
</ThemeProvider>);
