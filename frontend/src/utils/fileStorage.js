import config from '../config.js';
import { encryptFile, decryptFile } from './encryption.js';

export const MAX_FILE_BYTES = 100 * 1024 * 1024;
const ENCRYPTION_OVERHEAD_BYTES = 28;
const STORAGE_PATH_PATTERN = /^(images|documents|uploads)\/[a-zA-Z0-9._-]+$/;

export const validateFileSize = (file) => {
  if (!file) throw new Error('Please select a file.');
  if (file.size > MAX_FILE_BYTES) throw new Error('File exceeds maximum size limit of 100MB.');
  if (file.size + ENCRYPTION_OVERHEAD_BYTES > MAX_FILE_BYTES) {
    throw new Error('Please choose a file slightly smaller than 100MB to allow for encryption.');
  }
};

export const normalizeStoragePath = (path) => {
  if (typeof path !== 'string') throw new Error('Invalid storage path.');
  if (/^https?:\/\//.test(path)) {
    const pathname = new URL(path).pathname;
    const prefix = '/infostuffsende/';
    const start = pathname.indexOf(prefix);
    path = start >= 0 ? decodeURIComponent(pathname.slice(start + prefix.length)) : '';
  }
  if (!STORAGE_PATH_PATTERN.test(path) || ['.', '..'].includes(path.split('/')[1]) || path.length > 1024) {
    throw new Error('Invalid storage path.');
  }
  return path;
};

export const createOpaqueStoragePath = (file, folder = 'uploads') => {
  if (!file) return null;
  if (!['images', 'documents', 'uploads'].includes(folder)) throw new Error('Invalid storage folder.');
  const extension = file.name?.includes('.') ? file.name.split('.').pop() : 'bin';
  const safeExtension = /^[a-zA-Z0-9_-]{1,32}$/.test(extension) ? extension.toLowerCase() : 'bin';
  return `${folder}/${crypto.randomUUID()}.${safeExtension}`;
};

const storageRequest = async (endpoint, method, body) => {
  const token = await window.Clerk?.session?.getToken();
  if (!token) throw new Error('Your session has expired. Please sign in again.');
  const baseUrl = (config.API_BASE_URL || '').replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/api/files${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || result.success !== true) {
    throw new Error(result.message || 'Unable to access file storage. Please try again.');
  }
  return result;
};

export const uploadToStorage = async (file, storagePath, key) => {
  validateFileSize(file);
  if (!key) throw new Error('Unlock your vault before uploading files.');
  storagePath = normalizeStoragePath(storagePath);
  // Encryption completes locally before requesting a URL or uploading any file bytes.
  const encryptedBlob = await encryptFile(file, key);
  if (!encryptedBlob) throw new Error('File encryption failed. No file was uploaded.');
  if (encryptedBlob.size > MAX_FILE_BYTES) throw new Error('File exceeds maximum size limit of 100MB.');
  const { uploadUrl } = await storageRequest('/presigned-upload', 'POST', {
    storagePath, byteSize: encryptedBlob.size, contentType: 'application/octet-stream',
  });
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT', body: encryptedBlob,
      headers: { 'Content-Type': 'application/octet-stream', 'If-None-Match': '*' },
    });
    if (!response.ok) throw new Error('Encrypted file upload failed. Please try again.');
  } catch (error) {
    // A failed PUT may still have reached storage. Remove it while retaining its live URL reservation.
    await deleteFromStorage(storagePath).catch(() => {});
    throw error;
  }
  return { storagePath, byteSize: encryptedBlob.size };
};

export const getDecryptedFileUrl = async (path, key, mimeType = 'application/octet-stream') => {
  if (!path || !key) return null;
  try {
    const { downloadUrl } = await storageRequest('/presigned-download', 'POST', {
      storagePath: normalizeStoragePath(path),
    });
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Unable to download the encrypted file.');
    const decryptedBlob = await decryptFile(await response.blob(), key, mimeType);
    if (!decryptedBlob) throw new Error('Unable to decrypt the file with this vault key.');
    return URL.createObjectURL(decryptedBlob);
  } catch (error) {
    console.error('Unable to open encrypted attachment:', error.message);
    return null;
  }
};

export const deleteFromStorage = async (path) => {
  await storageRequest('', 'DELETE', { storagePath: normalizeStoragePath(path) });
  return true;
};

export const uploadToSupabase = uploadToStorage;
export const deleteFromSupabase = deleteFromStorage;
