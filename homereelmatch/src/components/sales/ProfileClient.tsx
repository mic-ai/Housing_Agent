"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const ProfileSchema = z.object({
  name: z.string().min(1, "氏名は必須です"),
  bio: z.string().max(500).optional(),
  houseMakerId: z.string().optional(),
});
type ProfileForm = z.infer<typeof ProfileSchema>;

type HouseMaker = { id: string; name: string };

export type FaceVideo = {
  id: string;
  rollType: "pre" | "post";
  publicUrl: string;
  durationSec: number;
  sortOrder: number;
};

type Props = {
  initialName: string;
  initialBio: string | null;
  initialHouseMakerId: string | null;
  houseMakers: HouseMaker[];
  initialFaceVideos: FaceVideo[];
};

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function FaceVideoUploadButton({
  rollType,
  onAdded,
}: {
  rollType: "pre" | "post";
  onAdded: (video: FaceVideo) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setError("動画ファイル（MP4/WebM/MOV）を選択してください");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", rollType);
      const res = await fetch("/api/salesperson/profile/face-videos", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "アップロードに失敗しました");
        return;
      }
      onAdded(json.data as FaceVideo);
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-3 py-1.5 border border-dashed border-gray-500 hover:border-gray-300 rounded text-xs text-gray-400 hover:text-gray-200 disabled:opacity-50 transition-colors"
      >
        {uploading ? "アップロード中..." : `+ ${rollType === "pre" ? "プリロール" : "ポストロール"}を追加（最大10秒）`}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

function FaceVideoList({
  label,
  rollType,
  videos,
  onDelete,
  onAdded,
}: {
  label: string;
  rollType: "pre" | "post";
  videos: FaceVideo[];
  onDelete: (id: string) => void;
  onAdded: (v: FaceVideo) => void;
}) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      const res = await fetch(`/api/salesperson/profile/face-videos/${id}`, { method: "DELETE" });
      if (res.ok) onDelete(id);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-300">{label}</p>
      {videos.length === 0 ? (
        <p className="text-xs text-gray-500">登録なし</p>
      ) : (
        <ul className="space-y-3">
          {videos.map((v) => (
            <li key={v.id} className="bg-gray-800 rounded-lg p-3 space-y-2">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video src={v.publicUrl} className="w-full rounded" controls muted />
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-300">{v.durationSec}秒</p>
                <button
                  type="button"
                  onClick={() => handleDelete(v.id)}
                  disabled={deleting === v.id}
                  className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
                >
                  {deleting === v.id ? "削除中..." : "削除"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <FaceVideoUploadButton rollType={rollType} onAdded={onAdded} />
    </div>
  );
}

export default function ProfileClient({
  initialName,
  initialBio,
  initialHouseMakerId,
  houseMakers,
  initialFaceVideos,
}: Props) {
  const [saved, setSaved] = useState(false);
  const [faceVideos, setFaceVideos] = useState<FaceVideo[]>(initialFaceVideos);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { name: initialName, bio: initialBio ?? "", houseMakerId: initialHouseMakerId ?? "" },
  });

  const onSubmit = async (data: ProfileForm) => {
    const res = await fetch("/api/salesperson/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, houseMakerId: data.houseMakerId || null }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const preVideos = faceVideos.filter((v) => v.rollType === "pre");
  const postVideos = faceVideos.filter((v) => v.rollType === "post");

  return (
    <div className="space-y-8">
      {/* 基本情報 */}
      <section className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-base font-semibold mb-4">基本情報</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">氏名</label>
            <input
              {...register("name")}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">所属ハウスメーカー</label>
            <select
              {...register("houseMakerId")}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">未選択</option>
              {houseMakers.map((hm) => (
                <option key={hm.id} value={hm.id}>{hm.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">プロフィール</label>
            <textarea
              {...register("bio")}
              rows={4}
              placeholder="自己紹介・得意分野など"
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              {isSubmitting ? "保存中..." : "保存する"}
            </button>
            {saved && <span className="text-green-400 text-sm">保存しました</span>}
          </div>
        </form>
      </section>

      {/* 顔出し動画 */}
      <section className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-base font-semibold mb-1">顔出し動画</h2>
        <p className="text-xs text-gray-400 mb-5">動画再生前後に表示される顔出し動画。複数登録可（各最大10秒）</p>
        <div className="space-y-6">
          <FaceVideoList
            label="プリロール（動画再生前）"
            rollType="pre"
            videos={preVideos}
            onDelete={(id) => setFaceVideos((prev) => prev.filter((v) => v.id !== id))}
            onAdded={(v) => setFaceVideos((prev) => [...prev, v])}
          />
          <FaceVideoList
            label="ポストロール（動画再生後）"
            rollType="post"
            videos={postVideos}
            onDelete={(id) => setFaceVideos((prev) => prev.filter((v) => v.id !== id))}
            onAdded={(v) => setFaceVideos((prev) => [...prev, v])}
          />
        </div>
      </section>
    </div>
  );
}
