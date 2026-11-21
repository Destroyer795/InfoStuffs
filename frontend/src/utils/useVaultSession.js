import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import config from '../config';
import { encryptText } from './encryption.js';
import { decryptVaultNotes, validateVaultMetadata } from './vaultCrypto.js';
import { normalizeStoragePath } from './fileStorage.js';
import { saveOfflineVaults, saveOfflineNotes, cacheOfflineNote, removeOfflineNote, clearOfflineVault } from './localStore.js';

const api = `${config.API_BASE_URL}/api`;
const emptyCatalog = (userId) => ({ userId, vaults: [], legacyNotes: [] });
const cancelled = () => new DOMException('Vault session changed.', 'AbortError');

export default function useVaultSession({ userId, getToken, notify }) {
  const [catalog, setCatalog] = useState(emptyCatalog(userId));
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadedOwner, setLoadedOwner] = useState(null);
  const [active, setActive] = useState(null);
  const [infos, setInfos] = useState([]);
  const epoch = useRef(0);
  const currentOwner = useRef(userId);
  currentOwner.current = userId;
  const previousOwner = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  const headers = useCallback(async (options) => {
    const token = await getToken(options);
    if (!token) throw new Error('Your sign-in session expired. Please sign in again.');
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const guard = useCallback((owner, sequence) => {
    if (currentOwner.current !== owner || epoch.current !== sequence) throw cancelled();
  }, []);

  const cache = useCallback(async (operation) => {
    try { await operation(); }
    catch (error) {
      if (error.name === 'AbortError') throw error;
      notify('The offline cache could not be updated. Your online vault is available.', 'warning');
    }
  }, [notify]);

  const fetchCatalog = useCallback(async (owner, sequence) => {
    const auth = await headers();
    guard(owner, sequence);
    const [vaultResponse, legacyResponse] = await Promise.all([
      axios.get(`${api}/vaults`, { headers: auth }), axios.get(`${api}/info`, { headers: auth }),
    ]);
    guard(owner, sequence);
    const vaults = vaultResponse.data.data;
    const legacyNotes = legacyResponse.data.data;
    if (!Array.isArray(vaults) || !Array.isArray(legacyNotes) || legacyNotes.some((note) => note.userId !== owner || note.vaultId)) {
      throw new Error('The encrypted vault response could not be verified. Please retry.');
    }
    vaults.forEach(validateVaultMetadata);
    const result = { userId: owner, vaults, legacyNotes };
    await cache(async () => {
      guard(owner, sequence);
      await saveOfflineVaults(vaults, owner);
      guard(owner, sequence);
      await saveOfflineNotes(legacyNotes, owner, null);
    });
    guard(owner, sequence);
    setCatalog(result);
    setLoadedOwner(owner);
    return result;
  }, [cache, guard, headers]);

  const reload = useCallback(async () => {
    if (!userId) return;
    const sequence = epoch.current;
    setLoading(true); setLoadError('');
    try { await fetchCatalog(userId, sequence); }
    catch (error) {
      if (error.name !== 'AbortError' && currentOwner.current === userId && epoch.current === sequence) {
        setLoadError(error.response?.data?.message || error.message || 'Unable to load encrypted vaults. Please retry.');
      }
    } finally { if (currentOwner.current === userId && epoch.current === sequence) setLoading(false); }
  }, [fetchCatalog, userId]);

  useEffect(() => {
    epoch.current += 1;
    setActive(null); setInfos([]); setCatalog(emptyCatalog(userId)); setLoadError(''); setLoadedOwner(null);
    if (previousOwner.current && previousOwner.current !== userId) clearOfflineVault().catch(() => notify('Offline cache could not be cleared. Clear this site data on shared devices.', 'warning'));
    previousOwner.current = userId;
    if (userId) reload();
    else setLoading(false);
    return () => { epoch.current += 1; };
  }, [userId, reload, notify]);

  const lock = useCallback(() => {
    epoch.current += 1;
    activeRef.current = null;
    setActive(null); setInfos([]);
    reload();
  }, [reload]);

  useEffect(() => {
    const clearSession = () => { epoch.current += 1; activeRef.current = null; setActive(null); setInfos([]); };
    window.addEventListener('infostuffs:lock', clearSession);
    return () => window.removeEventListener('infostuffs:lock', clearSession);
  }, []);

  const activate = useCallback(async (match) => {
    const owner = userId;
    const sequence = epoch.current;
    if (!owner || catalog.userId !== owner) throw cancelled();
    if (loadedOwner !== owner || loadError) throw new Error('Load and verify your encrypted vault information before continuing.');
    const auth = await headers();
    guard(owner, sequence);
    const { metadata, key, name } = match;
    const ids = match.legacyInfoIds || [];
    if (match.newVault || match.pendingLegacyRegistration) {
      await axios.post(`${api}/vaults`, { ...metadata, legacyInfoIds: ids.slice(0, 1000) }, { headers: auth });
      guard(owner, sequence);
    }
    const offset = match.newVault || match.pendingLegacyRegistration ? 1000 : 0;
    for (let index = offset; index < ids.length; index += 1000) {
      await axios.post(`${api}/vaults/${metadata.id}/adopt-legacy`, { legacyInfoIds: ids.slice(index, index + 1000) }, { headers: auth });
      guard(owner, sequence);
    }
    const response = await axios.get(`${api}/info`, { headers: auth, params: { vaultId: metadata.id } });
    guard(owner, sequence);
    const rawNotes = response.data.data;
    if (!Array.isArray(rawNotes) || rawNotes.some((note) => note.userId !== owner || note.vaultId !== metadata.id)) throw new Error('Vault content did not match the requested vault.');
    const decrypted = await decryptVaultNotes(rawNotes, key);
    guard(owner, sequence);
    let mappingFailures = 0;
    for (const note of decrypted.notes) {
      if (note.storagePaths?.length || !(note.imageURL || note.file)) continue;
      try {
        const storagePaths = [...new Set([note.imageURL, note.file].filter(Boolean).map(normalizeStoragePath))];
        const synced = await axios.patch(`${api}/info/${note._id}`, { storagePaths, vaultId: metadata.id }, { headers: auth });
        guard(owner, sequence);
        Object.assign(note, { storagePaths: synced.data.data.storagePaths, byteSize: synced.data.data.byteSize });
        rawNotes[rawNotes.findIndex((raw) => raw._id === note._id)] = synced.data.data;
      } catch (error) { if (error.name === 'AbortError') throw error; mappingFailures += 1; }
    }
    await fetchCatalog(owner, sequence);
    guard(owner, sequence);
    await cache(() => saveOfflineNotes(rawNotes, owner, metadata.id));
    guard(owner, sequence);
    const session = { id: metadata.id, userId: owner, name, key };
    activeRef.current = session;
    setActive(session); setInfos(decrypted.notes);
    if (decrypted.failedCount) notify(`${decrypted.failedCount} encrypted item(s) could not be verified and were kept unchanged.`, 'warning');
    else if (mappingFailures) notify('Some attachment metadata could not be synced. Your ciphertext is retained. Please retry later.', 'warning');
  }, [cache, catalog.userId, fetchCatalog, guard, headers, loadedOwner, loadError, notify, userId]);

  const requireSession = () => {
    const session = activeRef.current;
    if (!session || session.userId !== currentOwner.current) throw new Error('Unlock your vault before saving.');
    return { session, sequence: epoch.current };
  };

  const encryptedPayload = async (data, session) => {
    const imagePath = data.type === 'image' ? data.imageURL : '';
    const filePath = data.type === 'file' ? data.file : '';
    const sealed = {
      vaultId: session.id, type: data.type, importance: data.importance,
      byteSize: data.type === 'text' ? 0 : data.byteSize || 0, storagePaths: [imagePath, filePath].filter(Boolean).map(normalizeStoragePath),
      name: await encryptText(data.name, session.key), category: await encryptText(data.category, session.key),
      content: data.type === 'text' ? await encryptText(data.content, session.key) : '',
      imageURL: imagePath ? await encryptText(imagePath, session.key) : '',
      file: filePath ? await encryptText(filePath, session.key) : '',
      isTemporary: data.isTemporary || false, expiresAt: data.expiresAt || null,
    };
    if (!sealed.name || !sealed.category || (data.type === 'text' && !sealed.content) ||
        (data.type === 'image' && !sealed.imageURL) || (data.type === 'file' && !sealed.file)) throw new Error('Encryption failed. Your content was not sent.');
    return sealed;
  };

  const save = async (data, id) => {
    const { session, sequence } = requireSession();
    const auth = await headers();
    const payload = await encryptedPayload(data, session);
    guard(session.userId, sequence);
    const response = id ? await axios.patch(`${api}/info/${id}`, payload, { headers: auth }) : await axios.post(`${api}/info`, payload, { headers: auth });
    guard(session.userId, sequence);
    const decrypted = await decryptVaultNotes([response.data.data], session.key);
    if (decrypted.failedCount) throw new Error('Saved ciphertext could not be verified. Lock and reopen your vault.');
    await cache(() => cacheOfflineNote(response.data.data, session.userId, session.id));
    guard(session.userId, sequence);
    setInfos((previous) => id ? previous.map((note) => note._id === id ? decrypted.notes[0] : note) : [decrypted.notes[0], ...previous]);
  };

  const remove = async (id) => {
    const { session, sequence } = requireSession();
    const auth = await headers();
    guard(session.userId, sequence);
    await axios.delete(`${api}/info/${id}`, { headers: auth, params: { vaultId: session.id } });
    guard(session.userId, sequence);
    await cache(() => removeOfflineNote(id, session.userId));
    guard(session.userId, sequence);
    setInfos((previous) => previous.filter((note) => note._id !== id));
  };

  const reset = async (verify = (send) => send()) => {
    const sequence = epoch.current;
    const result = await verify(async () => {
      guard(userId, sequence);
      const auth = await headers({ skipCache: true });
      guard(userId, sequence);
      const response = await axios.delete(`${api}/info/nuke`, { headers: auth });
      return response.data;
    });
    guard(userId, sequence);
    if (result?.success !== true) {
      throw new Error('Verify your sign-in again before resetting your vaults.');
    }
    await clearOfflineVault();
    guard(userId, sequence);
    activeRef.current = null;
    setActive(null); setInfos([]); setCatalog(emptyCatalog(userId));
    await fetchCatalog(userId, sequence);
    notify('All vaults have been reset.', 'success');
  };

  const ownedActive = active?.userId === userId ? active : null;
  return { catalog: catalog.userId === userId ? catalog : emptyCatalog(userId), loading: loading || (!!userId && loadedOwner !== userId && !loadError), loadError, reload,
    active: ownedActive, infos: ownedActive ? infos : [], activate, lock, reset,
    createInfo: (data) => save(data), updateInfo: (id, data) => save(data, id), deleteInfo: remove };
}
