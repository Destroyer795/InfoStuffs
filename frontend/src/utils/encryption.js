import CryptoJS from 'crypto-js';

// Generates a 256-bit key from the user's password + salt which is unique per user and secure
export const generateKeyFromPassword = (password, salt) => {
  if (!password || !salt) return null;
  
  // PBKDF2 with 300000 iterations makes brute-forcing expensive
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32, // 256-bit key
    iterations: 300000
  }).toString();
};

// Encrypts using a dynamic key passed in at runtime
export const encryptText = (text, userKey) => {
  if (!text) return '';
  if (!userKey) throw new Error("Encryption Failed: No Key Provided");
  
  return CryptoJS.AES.encrypt(text, userKey).toString();
};

// Decrypts using a dynamic key passed in at runtime
export const decryptText = (cipherText, userKey) => {
  if (!cipherText || !userKey) return '';
  
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, userKey);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return decrypted || ''; //Returning empty string if decryption produces garbage (wrong key)
  } catch (error) {
    console.error("Decryption error:", error);
    return '';
  }
};