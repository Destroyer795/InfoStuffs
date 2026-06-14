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

// Helper to convert Uint8Array to base64 safely and performantly
const bytesToBase64 = (bytes) => {
  let binString = "";
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binString += String.fromCharCode(bytes[i]);
  }
  return btoa(binString);
};

// Helper to convert base64 to Uint8Array performantly
const base64ToBytes = (base64) => {
  const binString = atob(base64);
  const len = binString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return bytes;
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

    const ivStr = bytesToBase64(iv);
    const dataStr = bytesToBase64(new Uint8Array(encryptedContent));
    
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
    
    const iv = base64ToBytes(ivStr);
    const data = base64ToBytes(dataStr);

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

// Encrypt File (Blob)
export const encryptFile = async (fileBlob, key) => {
  if (!fileBlob || !key) return null;

  try {
    const arrayBuffer = await fileBlob.arrayBuffer();
    const iv = getCrypto().getRandomValues(new Uint8Array(12));

    const encryptedContent = await subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      arrayBuffer
    );

    // Combine IV and encrypted content
    return new Blob([iv, encryptedContent], { type: "application/octet-stream" });
  } catch (e) {
    console.error("File encryption failed:", e);
    return null;
  }
};

// Decrypt File (Blob)
export const decryptFile = async (encryptedBlob, key, mimeType = "application/octet-stream") => {
  if (!encryptedBlob || !key) return null;

  try {
    const arrayBuffer = await encryptedBlob.arrayBuffer();
    const iv = arrayBuffer.slice(0, 12);
    const data = arrayBuffer.slice(12);

    const decryptedContent = await subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      data
    );

    return new Blob([decryptedContent], { type: mimeType });
  } catch (e) {
    console.error("File decryption failed:", e);
    return null;
  }
};