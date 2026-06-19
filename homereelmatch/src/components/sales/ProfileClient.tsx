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

type ProfileVideo = {
  id: string;
  url: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  title: string | null;
};

type FaceVideoState = {
  publicUrl: string | null;
  durationSec: number | null;
};

type Props = {
  initialName: string;
  initialBio: string | null;
  initialHouseMakerId: string | null;
  houseMakers: HouseMaker[];
  profileVideos: ProfileVideo[];
  initialPreRoll: FaceVideoState;
  initialPostRoll: FaceVideoState;
};

const VideoSchema = z.object({
  url: z.string().url("有効なURLを入力してください"),
  platform: z.enum(["YOUTUBE", "INSTAGRAM"]),
  title: z.string().optional(),
});
type VideoForm = z.infer<typeof VideoSchema>;

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function FaceRollUploader({
  label,
  type,
  current,
  onUploaded,
  onDeleted,
}: {
  label: string;
  type: "pre" | "post";
  current: FaceVideoState;
  onUploaded: (publicUrl: string, durationSec: number) => void;
  onDeleted: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      fd.append("type", type);
      const res = await fetch("/api/salesperson/profile/face-video", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "アップロードに失敗しました");
        return;
      }
      onUploaded(data.publicUrl as string, data.durationSec as number);
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/salesperson/profile/face-video?type=${type}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "削除に失敗しました");
        return;
      }
      onDeleted();
    } catch {
      setError("削除に失敗しました");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-300">{label}</p>
      {current.publicUrl ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video src={current.publicUrl} controls className="w-full rounded-lg max-h-40" />
          <p className="text-xs text-gray-400">尺: {current.durationSec}秒</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs font-medium transition-colors"
            >
              変更
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded text-xs font-medium transition-colors"
            >
              {deleting ? "削除中..." : "削除"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-600 rounded-lg py-4 text-sm text-gray-400 hover:border-gray-400 transition-colors"
        >
          {uploading ? "アップロード中..." : "クリックして動画を選択（最大10秒）"}
        </button>
      )}
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
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function ProfileClient({
  initialName,
  initialBio,
  initialHouseMakerId,
  houseMakers,
  profileVideos: initialVideos,
  initialPreRoll,
  initialPostRoll,
}: Props) {
  const [saved, setSaved] = useState(false);
  const [videos, setVideos] = useState<ProfileVideo[]>(initialVideos);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [preRoll, setPreRoll] = useState<FaceVideoState>(initialPreRoll);
  const [postRoll, setPostRoll] = useState<FaceVideoState>(initialPostRoll);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: { name: initialName, bio: initialBio ?? "", houseMakerId: initialHouseMakerId ?? "" },
  });

  const videoForm = useForm<VideoForm>({
    resolver: zodResolver(VideoSchema),
    defaultValues: { platform: "YOUTUBE" },
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

  const onAddVideo = async (data: VideoForm) => {
    const res = await fetch("/api/salesperson/profile/videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await res.json();
      setVideos((prev) => [...prev, json.data]);
      videoForm.reset({ platform: "YOUTUBE" });
      setShowVideoForm(false);
    }
  };

  const onDeleteVideo = async (id: string) => {
    const res = await fetch(`/api/salesperson/profile/videos/${id}`, { method: "DELETE" });
    if (res.ok) setVideos((prev) => prev.filter((v) => v.id !== id));
  };

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
        <p className="text-xs text-gray-400 mb-4">動画再生前後に表示される自己紹介動画（各最大10秒）</p>
        <div className="space-y-6">
          <FaceRollUploader
            label="プリロール（動画再生前）"
            type="pre"
            current={preRoll}
            onUploaded={(url, sec) => setPreRoll({ publicUrl: url, durationSec: sec })}
            onDeleted={() => setPreRoll({ publicUrl: null, durationSec: null })}
          />
          <FaceRollUploader
            label="ポストロール（動画再生後）"
            type="post"
            current={postRoll}
            onUploaded={(url, sec) => setPostRoll({ publicUrl: url, durationSec: sec })}
            onDeleted={() => setPostRoll({ publicUrl: null, durationSec: null })}
          />
        </div>
      </section>

      {/* 自己紹介動画 */}
      <section className="bg-gray-900 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold">自己紹介動画</h2>
            <p className="text-xs text-gray-400 mt-0.5">プロフィールに表示するYouTube/Instagram動画のURL</p>
          </div>
          <button
            onClick={() => setShowVideoForm((v) => !v)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-medium transition-colors"
          >
            + 追加
          </button>
        </div>

        {showVideoForm && (
          <form onSubmit={videoForm.handleSubmit(onAddVideo)} className="mb-4 p-4 bg-gray-800 rounded-lg space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">プラットフォーム</label>
              <select
                {...videoForm.register("platform")}
                className="bg-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none"
              >
                <option value="YOUTUBE">YouTube</option>
                <option value="INSTAGRAM">Instagram</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">動画URL</label>
              <input
                {...videoForm.register("url")}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none"
              />
              {videoForm.formState.errors.url && (
                <p className="text-red-400 text-xs mt-1">{videoForm.formState.errors.url.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">タイトル（任意）</label>
              <input
                {...videoForm.register("title")}
                className="w-full bg-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium transition-colors">
                追加
              </button>
              <button type="button" onClick={() => setShowVideoForm(false)} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors">
                キャンセル
              </button>
            </div>
          </form>
        )}

        {videos.length === 0 ? (
          <p className="text-gray-500 text-sm">動画が登録されていません</p>
        ) : (
          <ul className="space-y-2">
            {videos.map((v) => (
              <li key={v.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <span className="text-xs text-gray-400 w-20 shrink-0">{v.platform}</span>
                <span className="text-sm text-white truncate flex-1">{v.title ?? v.url}</span>
                <button
                  onClick={() => onDeleteVideo(v.id)}
                  className="text-red-400 hover:text-red-300 text-xs shrink-0"
                >
                  削除
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
