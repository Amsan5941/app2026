import { supabase } from "@/constants/supabase";

const BUCKET = "progress-photos";

export type PhotoRow = {
  id: string;
  user_id: string;
  storage_path: string;
  recorded_date: string;
  caption?: string | null;
  created_at: string;
};

export async function uploadProgressPhoto({
  authUid,
  userId,
  fileName,
  blob,
  recordedDate,
  caption,
}: {
  authUid: string;
  userId: string;
  fileName: string;
  blob: Blob | Uint8Array;
  recordedDate?: string;
  caption?: string;
}) {
  const path = `${authUid}/${fileName}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob as any, {
      contentType: "image/jpeg",
      upsert: false,
    });
  if (upErr) return { success: false, error: upErr };

  const { data, error } = await supabase
    .from("progress_photos")
    .insert({
      user_id: userId,
      storage_path: path,
      recorded_date: recordedDate ?? new Date().toISOString().slice(0, 10),
      caption: caption ?? null,
    })
    .select()
    .single();

  if (error) return { success: false, error };
  return { success: true, data };
}

export async function getProgressPhotos(userId: string) {
  const { data, error } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error };

  const items = await Promise.all(
    (data || []).map(async (r) => {
      const { data: urlData, error: urlErr } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(r.storage_path, 60 * 60);
      return { ...r, url: urlData?.signedUrl ?? null, urlError: urlErr };
    }),
  );
  return { success: true, data: items };
}

export async function deleteProgressPhoto(
  photoId: string,
  storagePath: string,
) {
  const { error: delErr } = await supabase.storage
    .from(BUCKET)
    .remove([storagePath]);
  if (delErr) return { success: false, error: delErr };
  const { error } = await supabase
    .from("progress_photos")
    .delete()
    .eq("id", photoId);
  if (error) return { success: false, error };
  return { success: true };
}
