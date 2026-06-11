import { supabase } from "../superbaseClient.js";
import { encryptFile, decryptFile } from "./encryption.js";

export const createOpaqueStoragePath = (file, folder = "uploads") => {
  if (!file) return null;

  const fileExt = file.name?.split(".").pop() || "bin";
  const uniqueId = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).substring(2)}`;

  return `${folder}/${uniqueId}.${fileExt}`;
};

export const uploadToSupabase = async (file, storagePath, key) => {
  if (!file || !storagePath || !key) return null;

  try {
    const encryptedBlob = await encryptFile(file, key);
    if (!encryptedBlob) throw new Error("File encryption failed");

    const { error } = await supabase.storage
      .from("infostuffsende")
      .upload(storagePath, encryptedBlob);

    if (error) {
      console.error("Supabase upload error:", error);
      return null;
    }
    
    return storagePath; 
  } catch (err) {
    console.error("Upload failed:", err);
    return null;
  }
};

export const getSignedUrl = async (path) => {
  if (!path) return null;
  try {
    const { data, error } = await supabase.storage
      .from("infostuffsende")
      .createSignedUrl(path, 60 * 60);

    if (error) {
      console.error("Error signing URL:", error);
      return null;
    }

    return data?.signedUrl || null;
  } catch (error) {
    console.error("Error signing URL:", error);
    return null;
  }
};

export const deleteFromSupabase = async (path) => {
  if (!path) return false;

  try {
    const { error } = await supabase.storage
      .from("infostuffsende")
      .remove([path]);

    if (error) {
      console.error("Delete error:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Delete failed:", err);
    return false;
  }
};

export const getDecryptedFileUrl = async (path, key, mimeType = "application/octet-stream") => {
  if (!path || !key) return null;
  try {
    const signedUrl = await getSignedUrl(path);
    if (!signedUrl) return null;

    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error("Failed to fetch file from signed URL");
    
    const encryptedBlob = await response.blob();
    const decryptedBlob = await decryptFile(encryptedBlob, key, mimeType);
    
    if (!decryptedBlob) return null;
    return URL.createObjectURL(decryptedBlob);
  } catch (error) {
    console.error("Error generating decrypted file URL:", error);
    return null;
  }
};