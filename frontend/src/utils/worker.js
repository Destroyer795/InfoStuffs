import { generateKeyFromPassword } from './encryption';

self.onmessage = async (e) => {
  const { password, salt } = e.data;
  
  try {
    // This runs on a background thread, so it won't freeze the UI
    const derivedKey = await generateKeyFromPassword(password, salt);
    self.postMessage({ success: true, key: derivedKey });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};