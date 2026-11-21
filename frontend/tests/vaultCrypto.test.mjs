import test from 'node:test';
import assert from 'node:assert/strict';
import { createVaultEnvelope, openVaultEnvelope, matchVaultPassword, decryptVaultNotes, validateVaultMetadata } from '../src/utils/vaultCrypto.js';
import { generateKeyFromPassword, encryptText, encryptFile, decryptFile } from '../src/utils/encryption.js';

const password = 'a long unique vault passphrase';
const first = await createVaultEnvelope({ password, name: 'Personal secrets' });
const second = await createVaultEnvelope({ password, name: 'Work secrets' });
const legacyPassword = 'old-pass';
const legacyKey = await generateKeyFromPassword(legacyPassword, 'alice');
const makeNote = async (key, id = 'one') => ({ _id: id, userId: 'alice', type: 'text',
  name: await encryptText('Private title', key), category: await encryptText('Private category', key), content: await encryptText('Secret text', key) });
const legacyNote = await makeNote(legacyKey);

test('wrapped keys verify the password even for empty vaults and remain non-extractable after unlock', async () => {
  const opened = await openVaultEnvelope(password, first.metadata);
  assert.equal(opened.name, 'Personal secrets');
  assert.equal(opened.key.extractable, false);
  await assert.rejects(crypto.subtle.exportKey('raw', opened.key));
  await assert.rejects(openVaultEnvelope('mistyped password', first.metadata), { name: 'OperationError' });
  const metadata = JSON.stringify(first.metadata);
  assert.equal(metadata.includes(password), false);
  assert.equal(metadata.includes('Personal secrets'), false);
});

test('independent vaults have fresh salts and data keys even when passwords are identical', async () => {
  assert.notEqual(first.metadata.kdf.salt, second.metadata.kdf.salt);
  assert.notEqual(first.metadata.id, second.metadata.id);
  const encrypted = await makeNote(first.key);
  assert.equal((await decryptVaultNotes([encrypted], second.key)).failedCount, 1);
  const matches = await matchVaultPassword({ password, userId: 'alice', vaults: [first.metadata, second.metadata] });
  assert.deepEqual(matches.map((match) => match.name), ['Personal secrets', 'Work secrets']);
  assert.deepEqual(await matchVaultPassword({ password: 'wrong', userId: 'alice', vaults: [first.metadata, second.metadata] }), []);
});

test('authentication binds wrapped keys and encrypted names to their vault and purpose', async () => {
  const swappedId = { ...first.metadata, id: second.metadata.id };
  await assert.rejects(openVaultEnvelope(password, swappedId), { name: 'OperationError' });
  const damaged = structuredClone(first.metadata);
  const bytes = Uint8Array.from(atob(damaged.wrappedKey.ciphertext), (char) => char.charCodeAt(0));
  bytes[0] ^= 1;
  damaged.wrappedKey.ciphertext = btoa(String.fromCharCode(...bytes));
  await assert.rejects(openVaultEnvelope(password, damaged), { name: 'OperationError' });
  await assert.rejects(openVaultEnvelope(password, { ...first.metadata, encryptedName: second.metadata.encryptedName }), /damaged/);
});

test('unsupported or malicious KDF metadata fails before expensive derivation', async () => {
  for (const mutation of [{ version: 2 }, { kdf: { ...first.metadata.kdf, iterations: 2 ** 31 } }, { kdf: { ...first.metadata.kdf, salt: 'not-base64' } }]) {
    assert.throws(() => validateVaultMetadata({ ...first.metadata, ...mutation }), /metadata/);
  }
  await assert.rejects(matchVaultPassword({ password, vaults: [{ ...first.metadata, version: 2 }] }), /metadata/);
  await assert.rejects(createVaultEnvelope({ password: 'short', name: 'New vault' }), /12/);
  await assert.rejects(createVaultEnvelope({ password, name: ' ' }), /vault name/);
});

test('legacy recovery requires authenticated decryption and wraps the unchanged historic key', async () => {
  const rawBefore = JSON.stringify(legacyNote);
  const otherLegacy = await makeNote(await generateKeyFromPassword('another-password', 'alice'), 'two');
  assert.deepEqual(await matchVaultPassword({ password: 'typo', userId: 'alice', legacyNotes: [legacyNote] }), []);
  const [recovered] = await matchVaultPassword({ password: legacyPassword, userId: 'alice', legacyNotes: [legacyNote, otherLegacy] });
  assert.equal(recovered.pendingLegacyRegistration, true);
  assert.deepEqual(recovered.legacyInfoIds, ['one']);
  assert.equal(JSON.stringify(legacyNote), rawBefore);
  const opened = await openVaultEnvelope(legacyPassword, recovered.metadata);
  assert.equal((await decryptVaultNotes([legacyNote], opened.key)).notes[0].content, 'Secret text');
  const encryptedFile = await encryptFile(new Blob(['historic file bytes']), legacyKey);
  assert.equal(await (await decryptFile(encryptedFile, opened.key)).text(), 'historic file bytes');
  const [again] = await matchVaultPassword({ password: legacyPassword, userId: 'alice', vaults: [recovered.metadata], legacyNotes: [legacyNote] });
  assert.equal(again.metadata.id, recovered.metadata.id);
  assert.equal(again.pendingLegacyRegistration, undefined);
  assert.deepEqual(again.legacyInfoIds, ['one']);
});

test('damaged required fields never appear as editable empty plaintext', async () => {
  const damaged = { ...legacyNote, content: await encryptText('different key content', first.key) };
  const result = await decryptVaultNotes([legacyNote, damaged], legacyKey);
  assert.equal(result.notes.length, 1);
  assert.equal(result.failedCount, 1);
  assert.equal(damaged.content.includes('different key content'), false);
  assert.deepEqual(await matchVaultPassword({ password: legacyPassword, userId: 'alice', legacyNotes: [damaged] }), []);
});
