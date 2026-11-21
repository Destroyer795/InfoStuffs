import { generateKeyFromPassword } from './encryption.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const iterations = 600000;
const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const encode = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
const aad = (id, purpose) => encoder.encode(`InfoStuffs:v1:${id}:${purpose}`);

const checkBytes = (value, minimum, maximum = minimum) => {
  if (typeof value !== 'string' || value.length > Math.ceil(maximum / 3) * 4) return false;
  try {
    const bytes = decode(value);
    return bytes.length >= minimum && bytes.length <= maximum && encode(bytes) === value;
  } catch { return false; }
};

export const validateVaultMetadata = (vault) => {
  if (!vault || typeof vault.id !== 'string' || !idPattern.test(vault.id) || vault.version !== 1 ||
      vault.kdf?.name !== 'PBKDF2' || vault.kdf.hash !== 'SHA-256' || vault.kdf.iterations !== iterations ||
      !checkBytes(vault.kdf.salt, 32) || !checkBytes(vault.wrappedKey?.iv, 12) ||
      !checkBytes(vault.wrappedKey?.ciphertext, 48) || !checkBytes(vault.encryptedName?.iv, 12) ||
      !checkBytes(vault.encryptedName?.ciphertext, 17, 496)) {
    throw new Error('Vault metadata could not be verified. Refresh or restore a trusted backup before continuing.');
  }
};

const passwordKey = async (password, salt) => {
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: decode(salt), iterations },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
};

const seal = async (bytes, key, id, purpose) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(id, purpose) }, key, bytes);
  return { iv: encode(iv), ciphertext: encode(ciphertext) };
};

const unseal = (envelope, key, id, purpose) => crypto.subtle.decrypt({ name: 'AES-GCM',
  iv: decode(envelope.iv), additionalData: aad(id, purpose) }, key, decode(envelope.ciphertext));

export const createVaultEnvelope = async ({ password, name, legacyKey = null }) => {
  if (typeof password !== 'string' || password.length < 12) throw new Error('Use at least 12 characters for a new vault password.');
  if (typeof name !== 'string' || !name.trim() || [...name.trim()].length > 120) throw new Error('Enter a vault name of 1 to 120 characters.');
  const id = crypto.randomUUID();
  const salt = encode(crypto.getRandomValues(new Uint8Array(32)));
  const wrappingKey = await passwordKey(password, salt);
  const rawKey = legacyKey ? new Uint8Array(await crypto.subtle.exportKey('raw', legacyKey)) : crypto.getRandomValues(new Uint8Array(32));
  try {
    const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']);
    const wrappedKey = await seal(rawKey, wrappingKey, id, 'data-key');
    const encryptedName = await seal(encoder.encode(name.trim()), key, id, 'name');
    return { metadata: { id, version: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt }, wrappedKey, encryptedName }, key, name: name.trim() };
  } finally { rawKey.fill(0); }
};

export const openVaultEnvelope = async (password, metadata) => {
  validateVaultMetadata(metadata);
  const wrappingKey = await passwordKey(password, metadata.kdf.salt);
  const rawKey = new Uint8Array(await unseal(metadata.wrappedKey, wrappingKey, metadata.id, 'data-key'));
  try {
    const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']);
    let name;
    try { name = decoder.decode(await unseal(metadata.encryptedName, key, metadata.id, 'name')); }
    catch { throw new Error('The vault name is damaged. Restore trusted vault metadata before continuing.'); }
    if (!name.trim()) throw new Error('The encrypted vault name is invalid.');
    return { metadata, key, name };
  } finally { rawKey.fill(0); }
};

// Legacy note fields use IV:ciphertext. Authentication failures must never become editable empty fields.
export const decryptVerifiedText = async (packed, key) => {
  if (typeof packed !== 'string' || packed.split(':').length !== 2) throw new Error('Invalid encrypted field.');
  const [iv, ciphertext] = packed.split(':');
  if (!checkBytes(iv, 12) || !ciphertext || ciphertext.length > 20_000_000) throw new Error('Invalid encrypted field.');
  return decoder.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(iv) }, key, decode(ciphertext)));
};

export const decryptVerifiedNote = async (note, key) => {
  const result = { ...note, name: await decryptVerifiedText(note.name, key), category: await decryptVerifiedText(note.category, key) };
  if (!result.name || !result.category) throw new Error('A required encrypted field is empty.');
  if (note.type === 'text') result.content = await decryptVerifiedText(note.content, key);
  else if (note.type === 'image') result.imageURL = await decryptVerifiedText(note.imageURL, key);
  else if (note.type === 'file') result.file = await decryptVerifiedText(note.file, key);
  else throw new Error('Unknown note type.');
  return result;
};

export const decryptVaultNotes = async (notes, key) => {
  const results = await Promise.allSettled(notes.map((note) => decryptVerifiedNote(note, key)));
  return { notes: results.filter((result) => result.status === 'fulfilled').map((result) => result.value),
    failedCount: results.filter((result) => result.status === 'rejected').length };
};

export const matchVaultPassword = async ({ password, userId, vaults = [], legacyNotes = [] }) => {
  vaults.forEach(validateVaultMetadata);
  const matches = [];
  for (const metadata of vaults) {
    try { matches.push({ ...await openVaultEnvelope(password, metadata), legacyInfoIds: [] }); }
    catch (error) {
      if (error.name !== 'OperationError') throw error;
    }
  }
  if (legacyNotes.length && userId) {
    const legacyKey = await generateKeyFromPassword(password, userId);
    const verified = await decryptVaultNotes(legacyNotes, legacyKey);
    if (verified.notes.length) {
      let existingMatch;
      for (const match of matches) {
        try { await decryptVerifiedNote(legacyNotes.find((note) => note._id === verified.notes[0]._id), match.key); existingMatch = match; break; }
        catch { /* A matching password can protect independent data keys. */ }
      }
      if (existingMatch) existingMatch.legacyInfoIds = verified.notes.map((note) => note._id);
      else {
        // Existing short passwords are retained during recovery. New vaults require a longer password.
        const recovered = await createLegacyEnvelope(password, legacyKey);
        matches.push({ ...recovered, legacyInfoIds: verified.notes.map((note) => note._id), pendingLegacyRegistration: true });
      }
    }
  }
  return matches;
};

const createLegacyEnvelope = async (password, legacyKey) => {
  // Reuse the envelope format without changing the historic password or data key.
  const id = crypto.randomUUID();
  const salt = encode(crypto.getRandomValues(new Uint8Array(32)));
  const wrappingKey = await passwordKey(password, salt);
  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', legacyKey));
  try {
    const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']);
    const name = 'Recovered vault';
    return { metadata: { id, version: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt },
      wrappedKey: await seal(rawKey, wrappingKey, id, 'data-key'), encryptedName: await seal(encoder.encode(name), key, id, 'name') }, key, name };
  } finally { rawKey.fill(0); }
};
