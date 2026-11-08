import { useEffect, useRef, useState } from "react";
import { Mic, Square, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VOICE_CLIPS } from "@sprout/index";
import { facePhotoPath, SPROUT_BUCKET, voiceClipPath } from "@/lib/sproutHost";

interface Props { userId: string; tab: "voice" | "photo"; onClose: () => void }

/**
 * Grown-up tools rendered over the game: record the fixed praise clips in Mama's or Myke's voice
 * and choose the hero face photo. Everything uploads to the private kid-media bucket.
 */
export function GrownUpTools({ userId, tab, onClose }: Props) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Grown-up tools" className="absolute inset-0 z-50 overflow-y-auto bg-[#111111]/95 p-5 text-white" style={{ fontFamily: '"Nunito", sans-serif' }}>
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-extrabold text-[#FFC531]" style={{ fontFamily: '"Lilita One", sans-serif' }}>{tab === "voice" ? "Record voices" : "Hero photo"}</h1>
          <button type="button" onClick={onClose} className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#FFC531] bg-[#1F2A33]" aria-label="Close"><X /></button>
        </div>
        {tab === "voice" ? <VoiceRecorder userId={userId} /> : <PhotoPicker userId={userId} />}
      </div>
    </div>
  );
}

function VoiceRecorder({ userId }: { userId: string }) {
  const [voice, setVoice] = useState<"mama" | "myke">("mama");
  const [recording, setRecording] = useState<string | null>(null);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<string>("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.storage.from(SPROUT_BUCKET).list(`${userId}/voice/${voice}`);
      if (!active) return;
      const found: Record<string, boolean> = {};
      for (const file of data ?? []) found[file.name.replace(/\.webm$/, "")] = true;
      setSaved(found);
    })();
    return () => { active = false; };
  }, [userId, voice]);

  const start = async (key: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunks.current = [];
      rec.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        setStatus("Saving…");
        const { error } = await supabase.storage.from(SPROUT_BUCKET).upload(voiceClipPath(userId, voice, key), blob, { upsert: true, contentType: blob.type });
        setStatus(error ? `Could not save: ${error.message}` : "Saved!");
        if (!error) setSaved(prev => ({ ...prev, [key]: true }));
        setRecording(null);
      };
      recorder.current = rec;
      rec.start();
      setRecording(key);
      setStatus("Recording… tap stop when done.");
    } catch {
      setStatus("Microphone permission is needed to record.");
    }
  };
  const stop = () => recorder.current?.stop();

  const play = async (key: string) => {
    const { data } = await supabase.storage.from(SPROUT_BUCKET).createSignedUrl(voiceClipPath(userId, voice, key), 300);
    if (data?.signedUrl) void new Audio(data.signedUrl).play().catch(() => {});
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/80">Kaleb hears these lines in the game. Record each one in your own voice. Clips stay private to your account.</p>
      <div className="flex gap-2">
        {(["mama", "myke"] as const).map(v => (
          <button key={v} type="button" onClick={() => setVoice(v)} className={`h-12 flex-1 rounded-xl border-2 font-extrabold capitalize ${voice === v ? "border-[#FFC531] bg-[#FFC531] text-[#111111]" : "border-[#FFC531] bg-[#1F2A33]"}`}>{v}</button>
        ))}
      </div>
      <ul className="space-y-3">
        {VOICE_CLIPS.map(clip => (
          <li key={clip.key} className="rounded-2xl border-2 border-[#FFC531] bg-[#1F2A33] p-4">
            <p className="mb-3 text-lg font-extrabold">“{clip.text}”</p>
            <div className="flex flex-wrap gap-2">
              {recording === clip.key ? (
                <button type="button" onClick={stop} className="flex h-12 items-center gap-2 rounded-xl bg-[#D9453D] px-4 font-extrabold"><Square className="size-4" /> Stop</button>
              ) : (
                <button type="button" disabled={!!recording} onClick={() => void start(clip.key)} className="flex h-12 items-center gap-2 rounded-xl bg-[#FF7A1A] px-4 font-extrabold disabled:opacity-50"><Mic className="size-4" /> {saved[clip.key] ? "Re-record" : "Record"}</button>
              )}
              {saved[clip.key] && <button type="button" onClick={() => void play(clip.key)} className="h-12 rounded-xl border-2 border-[#FFC531] px-4 font-extrabold">Play</button>}
            </div>
          </li>
        ))}
      </ul>
      {status && <p role="status" className="text-sm text-[#FFC531]">{status}</p>}
    </div>
  );
}

function PhotoPicker({ userId }: { userId: string }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let active = true;
    supabase.storage.from(SPROUT_BUCKET).createSignedUrl(facePhotoPath(userId), 300).then(({ data }) => { if (active && data?.signedUrl) setPreview(data.signedUrl); });
    return () => { active = false; };
  }, [userId]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setStatus("Resizing…");
    const blob = await squareJpeg(file, 512);
    const { error } = await supabase.storage.from(SPROUT_BUCKET).upload(facePhotoPath(userId), blob, { upsert: true, contentType: "image/jpeg" });
    if (error) { setStatus(`Could not save: ${error.message}`); return; }
    setPreview(URL.createObjectURL(blob));
    setStatus("Saved! Turn it on under My Hero in the game.");
  };

  const remove = async () => {
    await supabase.storage.from(SPROUT_BUCKET).remove([facePhotoPath(userId)]);
    setPreview(null);
    setStatus("Photo removed.");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/80">Pick a photo of Kaleb's face. It is cropped to a circle inside the hero mask and stored privately for your account only.</p>
      <div className="flex items-center gap-4">
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-[#FFC531] bg-[#4C8C3C]">{preview ? <img src={preview} alt="Hero face preview" className="h-full w-full object-cover" /> : <span className="text-xs text-white/70">No photo</span>}</div>
        <div className="flex flex-col gap-2">
          <label className="flex h-12 cursor-pointer items-center gap-2 rounded-xl bg-[#FF7A1A] px-4 font-extrabold"><Upload className="size-4" /> Choose photo<input type="file" accept="image/*" className="hidden" onChange={event => void onFile(event.target.files?.[0])} /></label>
          {preview && <button type="button" onClick={() => void remove()} className="h-12 rounded-xl border-2 border-[#FFC531] px-4 font-extrabold">Remove</button>}
        </div>
      </div>
      {status && <p role="status" className="text-sm text-[#FFC531]">{status}</p>}
    </div>
  );
}

/** Center-crops to a square and re-encodes as JPEG so the texture stays small. */
async function squareJpeg(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob ?? file), "image/jpeg", 0.86));
}
