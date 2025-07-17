import { supabase } from "../superbaseClient.js";

export const uploadToSupabase = async (file, folder = "uploads") => {
  if (!file) return null;

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

  try {
    const { data, error } = await supabase.storage
      .from("infostuffs")
      .upload(`${folder}/${fileName}`, file);

    if (error) {
      console.error("Supabase upload error:", error);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from("infostuffs")
      .getPublicUrl(`${folder}/${fileName}`);

    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.error("Upload failed:", err);
    return null;
  }
};
