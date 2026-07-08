"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { IntroVideoUploader } from "./IntroVideoUploader";

const ProfileSchema = z.object({
  name: z.string().min(1, "氏名は必須です"),
  profileDetail: z.string().max(3000, "3000文字以内で入力してください").optional(),
  houseMakerId: z.string().optional(),
  toneQuote: z.string().max(60, "60文字以内で入力してください").optional(),
  yearsExperience: z.string().optional(),
  handoverCount: z.string().optional(),
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
  initialProfileDetail: string | null;
  initialProfileImage: string | null;
  initialHouseMakerId: string | null;
  houseMakers: HouseMaker[];
  initialFaceVideos: FaceVideo[];
  initialToneQuote: string | null;
  initialYearsExperience: number | null;
  initialHandoverCount: number | null;
  initialIntroVideoUrl: string | null;
  initialIntroVideoDurationSec: number | null;
};

function PersonIcon() {
  return (
    <svg className="w-10 h-10 text-stone-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
    </svg>
  );
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

function ProfileImageUpload({
  currentImageUrl,
  onUploaded,
}: {
  currentImageUrl: string | null;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError("JPEG / PNG / WebP 形式の画像を選択してください");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("ファイルサイズは5MB以下にしてください");
      return;
    }
    // local preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/salesperson/profile/icon", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "アップロードに失敗しました");
        return;
      }
      onUploaded(json.data.profileImage);
    } catch {
      setError("アップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-20 h-20 rounded-full overflow-hidden bg-gray-800 flex items-center justify-center ring-2 ring-gray-700 hover:ring-amber-500 transition-all disabled:opacity-50 flex-shrink-0"
        aria-label="プロフィール画像を変更"
      >
        {preview ? (
          <Image src={preview} alt="プロフィール画像" width={80} height={80} className="object-cover w-full h-full" />
        ) : (
          <PersonIcon />
        )}
      </button>
      <div className="space-y-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg text-xs text-gray-300 transition-colors border border-gray-700"
        >
          {uploading ? "アップロード中..." : "画像を変更"}
        </button>
        <p className="text-xs text-gray-500">JPEG / PNG / WebP・5MB以下</p>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

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
  initialProfileDetail,
  initialProfileImage,
  initialHouseMakerId,
  houseMakers,
  initialFaceVideos,
  initialToneQuote,
  initialYearsExperience,
  initialHandoverCount,
  initialIntroVideoUrl,
  initialIntroVideoDurationSec,
}: Props) {
  const [saved, setSaved] = useState(false);
  const [faceVideos, setFaceVideos] = useState<FaceVideo[]>(initialFaceVideos);
  // profileImage is managed separately via the icon upload endpoint
  // but we track it here so the preview stays in sync
  const [_profileImage, setProfileImage] = useState<string | null>(initialProfileImage);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<ProfileForm>({
    resolver: zodResolver(ProfileSchema),
    defaultValues: {
      name: initialName,
      profileDetail: initialProfileDetail ?? "",
      houseMakerId: initialHouseMakerId ?? "",
      toneQuote: initialToneQuote ?? "",
      yearsExperience: initialYearsExperience?.toString() ?? "",
      handoverCount: initialHandoverCount?.toString() ?? "",
    },
  });

  const profileDetailValue = watch("profileDetail") ?? "";
  const toneQuoteValue = watch("toneQuote") ?? "";

  const onSubmit = async (data: ProfileForm) => {
    const res = await fetch("/api/salesperson/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        houseMakerId: data.houseMakerId || null,
        profileDetail: data.profileDetail || null,
        toneQuote: data.toneQuote || null,
        yearsExperience: data.yearsExperience ? Number(data.yearsExperience) : null,
        handoverCount: data.handoverCount ? Number(data.handoverCount) : null,
      }),
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
      {/* プロフィール画像 */}
      <section className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-base font-semibold mb-4">プロフィール写真</h2>
        <ProfileImageUpload
          currentImageUrl={_profileImage}
          onUploaded={(url) => setProfileImage(url)}
        />
      </section>

      {/* 基本情報 */}
      <section className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-base font-semibold mb-4">基本情報</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">氏名</label>
            <input
              {...register("name")}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">所属ハウスメーカー</label>
            <select
              {...register("houseMakerId")}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">未選択</option>
              {houseMakers.map((hm) => (
                <option key={hm.id} value={hm.id}>{hm.name}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm text-gray-400">スタンス一言</label>
              <span className={`text-xs ${toneQuoteValue.length > 45 ? "text-amber-400" : "text-gray-500"}`}>
                {toneQuoteValue.length} / 60
              </span>
            </div>
            <input
              {...register("toneQuote")}
              placeholder="動画オーバーレイ・プロフィールページ上部に表示される短い一言"
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {errors.toneQuote && <p className="text-red-400 text-xs mt-1">{errors.toneQuote.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm text-gray-400">詳細プロフィール（家づくりで大切にしていること）</label>
              <span className={`text-xs ${profileDetailValue.length > 2700 ? "text-amber-400" : "text-gray-500"}`}>
                {profileDetailValue.length} / 3000
              </span>
            </div>
            <textarea
              {...register("profileDetail")}
              rows={8}
              placeholder={`プロフィールページに表示される詳細な自己紹介文。\n\n例）経歴・資格・得意な住宅スタイル・家づくりで大切にしていること・お客様へのメッセージなど`}
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 resize-y"
            />
            {errors.profileDetail && (
              <p className="text-red-400 text-xs mt-1">{errors.profileDetail.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">プロフィールページ（公開URL）に表示されます</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">経験年数</label>
              <input
                type="number"
                min={0}
                max={80}
                {...register("yearsExperience")}
                className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">引き渡し棟数</label>
              <input
                type="number"
                min={0}
                {...register("handoverCount")}
                className="w-full bg-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
            >
              {isSubmitting ? "保存中..." : "保存する"}
            </button>
            {saved && <span className="text-green-400 text-sm">保存しました ✓</span>}
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

      {/* 自己紹介動画 */}
      <section className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-base font-semibold mb-1">自己紹介動画</h2>
        <p className="text-xs text-gray-400 mb-5">
          プロフィールページ上部に表示される自己紹介動画（30秒以内）
        </p>
        <IntroVideoUploader
          initialUrl={initialIntroVideoUrl}
          initialDurationSec={initialIntroVideoDurationSec}
        />
      </section>
    </div>
  );
}
