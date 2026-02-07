// Helper to get the correct crypto object (works in Window AND Worker)
const getCrypto = () => {
  if (typeof crypto !== 'undefined') return crypto;
  if (typeof window !== 'undefined' && window.crypto) return window.crypto;
  if (typeof self !== 'undefined' && self.crypto) return self.crypto;
  throw new Error("Web Crypto API not available");
};

const subtle = getCrypto().subtle;

// Generate Key (PBKDF2)
export const generateKeyFromPassword = async (password, salt) => {
  if (!password || !salt) return null;
  
  const enc = new TextEncoder();
  
  // Import password
  const keyMaterial = await subtle.importKey(
    "raw", 
    enc.encode(password), 
    { name: "PBKDF2" }, 
    false, 
    ["deriveKey"]
  );

  // Derive AES-GCM Key
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 300000, 
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true, 
    ["encrypt", "decrypt"]
  );
};

// Encrypt Text
export const encryptText = async (text, key) => {
  if (!text || !key) return '';

  try {
    const enc = new TextEncoder();
    const iv = getCrypto().getRandomValues(new Uint8Array(12)); 

    const encryptedContent = await subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(text)
    );

    const ivStr = btoa(String.fromCharCode(...iv));
    const dataStr = btoa(String.fromCharCode(...new Uint8Array(encryptedContent)));
    
    return `${ivStr}:${dataStr}`;
  } catch (e) {
    console.error("Encryption failed:", e);
    return '';
  }
};

// Decrypt Text
export const decryptText = async (packedData, key) => {
  if (!packedData || !key) return '';

  try {
    const parts = packedData.split(':');
    if (parts.length !== 2) return ''; 

    const [ivStr, dataStr] = parts;
    
    const iv = Uint8Array.from(atob(ivStr), c => c.charCodeAt(0));
    const data = Uint8Array.from(atob(dataStr), c => c.charCodeAt(0));

    const decryptedContent = await subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      data
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedContent);
  } catch (e) {
    return ''; 
  }
};