import { generateKeyFromPassword } from './encryption';
import { createVaultEnvelope, matchVaultPassword } from './vaultCrypto.js';

self.onmessage = async (e) => {
  const { password, salt, action, ...options } = e.data;
  
  try {
    // This runs on a background thread, so it won't freeze the UI
    if (action === 'unlock') {
      self.postMessage({ success: true, matches: await matchVaultPassword({ password, ...options }) });
    } else if (action === 'create') {
      self.postMessage({ success: true, vault: await createVaultEnvelope({ password, ...options }) });
    } else {
      const derivedKey = await generateKeyFromPassword(password, salt);
      self.postMessage({ success: true, key: derivedKey });
    }
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
