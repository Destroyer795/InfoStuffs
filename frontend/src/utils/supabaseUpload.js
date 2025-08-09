import { supabase } from "../superbaseClient.js";

export const uploadToSupabase = async (file, userId, folder = "uploads") => {
  if (!file || !userId) return null;

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${userId}/${folder}/${fileName}`;

  try {
    const { error } = await supabase.storage
      .from("infostuffsende")
      .upload(filePath, file);

    if (error) {
      console.error("Supabase upload error:", error);
      return null;
    }
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("infostuffsende")
      .createSignedUrl(filePath, 60 * 60 * 24 * 7);

    if (signedUrlError) {
      console.error("Signed URL generation failed:", signedUrlError);
      return null;
    }

    return signedUrlData?.signedUrl || null;
  } catch (err) {
    console.error("Upload failed:", err);
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
