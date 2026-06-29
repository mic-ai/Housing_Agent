"use client";

import { useState, useEffect } from "react";

interface FaceVideo {
  id: string;
  rollType: "pre" | "post";
  publicUrl: string;
  durationSec: number;
}

interface Salesperson {
  id: string;
  name: string;
  company: { name: string };
  faceVideos: FaceVideo[];
}

interface Video {
  id: string;
  platform: "YOUTUBE" | "INSTAGRAM";
  url: string;
  title: string;
  thumbnailUrl: string | null;
  hashtags: string[];
}

interface Assignment {
  id: string;
  isPrimary: boolean;
  preRollPublicUrl: string | null;
  postRollPublicUrl: string | null;
  salesperson: Salesperson;
  video: Video;
}

interface Props {
  initialAssignments: Assignment[];
  salespersons: Omit<Salesperson, "faceVideos">[];
  videos: Video[];
}

function extractYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m?.[1] ?? null;
}

function FaceVideoPreview({ url, label }: { url: string | undefined; label: string }) {
  const [err, setErr] = useState(false);

  if (!url) {
    return (
      <div>
        <p className="text-xs text-stone-400 mb-1">{label}</p>
        <div className="w-40 h-24 rounded bg-stone-800 flex items-center justify-center">
          <p className="text-stone-500 text-xs text-center px-2">URL未設定</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-stone-400 mb-1">{label}</p>
      {err ? (
        <div className="w-40 h-24 rounded bg-red-950 flex flex-col items-center justify-center gap-1 px-2">
          <p className="text-red-400 text-xs text-center">読み込みエラー</p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 text-xs underline break-all"
          >
            URLを開く
          </a>
        </div>
      ) : (
        <>
          <video
            src={url}
            controls
            playsInline
            preload="auto"
            onLoadedMetadata={(e) => { e.currentTarget.currentTime = 0.1; }}
            onError={() => setErr(true)}
            className="w-40 h-24 rounded object-cover bg-stone-800"
          />
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-blue-400 text-xs underline mt-1 truncate max-w-[160px]"
          >
            URLで確認
          </a>
        </>
      )}
    </div>
  );
}

function FaceVideoSelect({
  label,
  options,
  selectedId,
  salespersonName,
  onSelect,
}: {
  label: string;
  options: FaceVideo[];
  selectedId: string | null;
  salespersonName: string;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-stone-400 mb-1">{label}</label>
      <select
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-1.5 text-white text-sm"
      >
        <option value="">（設定しない）</option>
        {options.map((fv, i) => (
          <option key={fv.id} value={fv.id}>
            {salespersonName}・{fv.rollType === "pre" ? "プリ" : "ポスト"}ロール{i + 1}（{fv.durationSec}秒）
          </option>
        ))}
      </select>
      {options.length === 0 && (
        <p className="text-stone-500 text-xs mt-1">顔出し動画がアップロードされていません</p>
      )}
    </div>
  );
}

function AssignmentRow({
  assignment,
  onDelete,
  onSetPrimary,
}: {
  assignment: Assignment;
  onDelete: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [settingPrimary, setSettingPrimary] = useState(false);
  const [title, setTitle] = useState(assignment.video.title);
  const [hashtags, setHashtags] = useState(assignment.video.hashtags.join(", "));
  const [preRollId, setPreRollId] = useState<string | null>(
    assignment.salesperson.faceVideos.find(
      (fv) => fv.publicUrl === assignment.preRollPublicUrl
    )?.id ?? null
  );
  const [postRollId, setPostRollId] = useState<string | null>(
    assignment.salesperson.faceVideos.find(
      (fv) => fv.publicUrl === assignment.postRollPublicUrl
    )?.id ?? null
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // 保存後の表示用（props は immutable なので state で持つ）
  const [savedPreRollUrl, setSavedPreRollUrl] = useState(assignment.preRollPublicUrl);
  const [savedPostRollUrl, setSavedPostRollUrl] = useState(assignment.postRollPublicUrl);

  async function handleSetPrimary() {
    setSettingPrimary(true);
    const res = await fetch(`/api/admin/assignments/${assignment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPrimary: true }),
    });
    if (res.ok) onSetPrimary(assignment.id);
    setSettingPrimary(false);
  }

  const v = assignment.video;
  const ytId = v.platform === "YOUTUBE" ? extractYouTubeId(v.url) : null;
  const thumbUrl = v.thumbnailUrl ?? (ytId ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null);

  const hasFaceVideos = assignment.salesperson.faceVideos.length > 0;

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/admin/assignments/${assignment.id}`, { method: "DELETE" });
    if (res.ok) onDelete(assignment.id);
    else setDeleting(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);

    const [videoRes, faceRes] = await Promise.all([
      fetch(`/api/admin/videos/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          hashtags: hashtags.split(/[,、\s]+/).map((t) => t.replace(/^#/, "").trim()).filter(Boolean),
        }),
      }),
      fetch(`/api/admin/assignments/${assignment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preRollFaceVideoId: preRollId, postRollFaceVideoId: postRollId }),
      }),
    ]);

    if (videoRes.ok && faceRes.ok) {
      // 行ヘッダーの状態を保存済みの値に更新
      const preUrl = preRollId
        ? assignment.salesperson.faceVideos.find((fv) => fv.id === preRollId)?.publicUrl ?? null
        : null;
      const postUrl = postRollId
        ? assignment.salesperson.faceVideos.find((fv) => fv.id === postRollId)?.publicUrl ?? null
        : null;
      setSavedPreRollUrl(preUrl);
      setSavedPostRollUrl(postUrl);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      const errBody = !faceRes.ok ? await faceRes.json().catch(() => ({})) : await videoRes.json().catch(() => ({}));
      setSaveError(errBody?.error ? JSON.stringify(errBody.error) : "保存に失敗しました");
    }
    setSaving(false);
  }

  return (
    <div className="py-3">
      {/* 行ヘッダー */}
      <div className="flex items-center gap-4">
        {thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbUrl} alt={v.title} className="w-20 h-12 object-cover rounded shrink-0" />
        ) : (
          <div className="w-20 h-12 bg-stone-700 rounded shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-white text-sm font-medium truncate">{title}</p>
            {assignment.isPrimary && (
              <span className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded bg-amber-600 text-white font-medium">
                メイン
              </span>
            )}
          </div>
          <p className="text-stone-400 text-xs">
            {assignment.salesperson.name}（{assignment.salesperson.company?.name}）
          </p>
          {hashtags && (
            <p className="text-amber-400 text-xs truncate">
              {hashtags.split(/[,、\s]+/).filter(Boolean).map((t) => `#${t.replace(/^#/, "")}`).join(" ")}
            </p>
          )}
          <p className="text-stone-500 text-xs">
            {hasFaceVideos ? (
              <>
                {savedPreRollUrl ? "プリロール✓" : "プリロール未設定"}
                {" / "}
                {savedPostRollUrl ? "ポストロール✓" : "ポストロール未設定"}
              </>
            ) : (
              "顔出し動画なし"
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!assignment.isPrimary && (
            <button
              type="button"
              onClick={handleSetPrimary}
              disabled={settingPrimary}
              className="text-xs px-2 py-1 rounded bg-amber-800 hover:bg-amber-700 text-amber-200 disabled:opacity-50"
            >
              {settingPrimary ? "設定中..." : "メインに設定"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            className="text-xs px-3 py-1 rounded bg-blue-800 hover:bg-blue-700 text-white"
          >
            {expanded ? "閉じる" : "編集・設定"}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-400 hover:text-red-300 text-xs disabled:opacity-50"
          >
            {deleting ? "削除中..." : "削除"}
          </button>
        </div>
      </div>

      {/* 展開パネル */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-stone-700 space-y-4">
          {/* プレビュー */}
          {ytId ? (
            <div className="aspect-video w-full max-w-sm">
              <iframe
                src={`https://www.youtube.com/embed/${ytId}`}
                title={v.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full rounded-lg"
              />
            </div>
          ) : thumbUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl} alt={v.title} className="w-full max-w-sm rounded-lg" />
          ) : null}

          <a
            href={`/watch/${v.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300 underline block"
          >
            視聴ページで確認 ↗
          </a>

          {/* タイトル編集 */}
          <div>
            <label className="block text-xs text-stone-400 mb-1">タイトル</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-1.5 text-white text-sm"
            />
          </div>

          {/* タグ編集 */}
          <div>
            <label className="block text-xs text-stone-400 mb-1">ハッシュタグ（カンマ区切り）</label>
            <input
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
              placeholder="新築, 注文住宅"
              className="w-full bg-stone-700 border border-stone-600 rounded px-3 py-1.5 text-white text-sm"
            />
          </div>

          {/* 顔出し動画設定 */}
          <div className="border border-stone-600 rounded-lg p-3 space-y-3">
            <p className="text-xs text-stone-300 font-medium">顔出し動画の接続</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FaceVideoSelect
                label="プリロール動画を選択"
                options={assignment.salesperson.faceVideos}
                selectedId={preRollId}
                salespersonName={assignment.salesperson.name}
                onSelect={setPreRollId}
              />
              <FaceVideoSelect
                label="ポストロール動画を選択"
                options={assignment.salesperson.faceVideos}
                selectedId={postRollId}
                salespersonName={assignment.salesperson.name}
                onSelect={setPostRollId}
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              {preRollId && (
                <FaceVideoPreview
                  url={assignment.salesperson.faceVideos.find((fv) => fv.id === preRollId)?.publicUrl}
                  label="プリロールプレビュー"
                />
              )}
              {postRollId && (
                <FaceVideoPreview
                  url={assignment.salesperson.faceVideos.find((fv) => fv.id === postRollId)?.publicUrl}
                  label="ポストロールプレビュー"
                />
              )}
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded"
            >
              {saving ? "保存中..." : "保存する"}
            </button>
            {saved && <span className="text-green-400 text-xs">保存しました</span>}
            {saveError && <span className="text-red-400 text-xs">{saveError}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function AssignmentManagerClient({ initialAssignments, salespersons, videos }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [availableVideos, setAvailableVideos] = useState<Video[]>(videos);
  const [salespersonId, setSalespersonId] = useState("");
  const [videoId, setVideoId] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/videos?isActive=true&limit=200")
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.data)) {
          setAvailableVideos(
            json.data.map((v: { id: string; platform: "YOUTUBE" | "INSTAGRAM"; url: string; title: string; thumbnailUrl: string | null; hashtags: string[] }) => ({
              id: v.id,
              platform: v.platform,
              url: v.url,
              title: v.title,
              thumbnailUrl: v.thumbnailUrl,
              hashtags: v.hashtags,
            }))
          );
        }
      })
      .catch(() => { /* keep initial videos on error */ });
  }, []);

  async function handleAdd() {
    if (!salespersonId || !videoId) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salespersonId, videoId }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "エラーが発生しました");
        return;
      }
      const { assignment } = await res.json();
      setAssignments((prev) => [assignment, ...prev]);
      setSalespersonId("");
      setVideoId("");
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 新規接続フォーム */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={salespersonId}
          onChange={(e) => setSalespersonId(e.target.value)}
          className="bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="">営業マンを選択</option>
          {salespersons.map((sp) => (
            <option key={sp.id} value={sp.id}>{sp.name}（{sp.company?.name}）</option>
          ))}
        </select>

        <select
          value={videoId}
          onChange={(e) => setVideoId(e.target.value)}
          className="bg-stone-800 border border-stone-700 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="">本編動画を選択</option>
          {availableVideos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
        </select>

        <button
          onClick={handleAdd}
          disabled={adding || !salespersonId || !videoId}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-stone-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {adding ? "追加中..." : "接続を追加"}
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* 接続一覧 */}
      {assignments.length === 0 ? (
        <p className="text-stone-500 text-sm py-4 text-center">接続設定がありません</p>
      ) : (
        <div className="divide-y divide-stone-700">
          {assignments.map((a) => (
            <AssignmentRow
              key={a.id}
              assignment={a}
              onDelete={(id) => setAssignments((prev) => prev.filter((x) => x.id !== id))}
              onSetPrimary={(id) =>
                setAssignments((prev) =>
                  prev.map((x) =>
                    x.video.id === assignments.find((a) => a.id === id)?.video.id
                      ? { ...x, isPrimary: x.id === id }
                      : x
                  )
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
