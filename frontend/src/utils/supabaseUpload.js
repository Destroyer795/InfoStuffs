import { supabase } from "../superbaseClient.js";

export const uploadToSupabase = async (file, folder = "uploads") => {
  if (!file) return null;

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  try {
    const { error } = await supabase.storage
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

export const deleteFromSupabase = async (url) => {
  if (!url) return false;
  try {
    const { error } = await supabase.storage
      .from("infostuffs")
      .remove([url]);

    if (error) {
      return false;
    }
    return true;
  } catch (err) {
    console.log(err)
    return false;
  }
};
