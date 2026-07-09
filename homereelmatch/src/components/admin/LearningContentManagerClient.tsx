"use client";

import { useState, useEffect, useCallback } from "react";
import { ArticleViewer } from "@/components/journey/ArticleViewer";
import type { ArticleDetailDTO, ArticleDifficulty, ArticleStatus } from "@/types";

interface HouseMakerOption {
  id: string;
  name: string;
}

interface HashtagOption {
  id: string;
  tagName: string;
}

interface AdminPhase {
  id: string;
  key: string;
  title: string;
  order: number;
  description: string | null;
  isActive: boolean;
  _count: { articles: number };
}

interface AdminArticleListItem {
  id: string;
  phaseId: string;
  order: number;
  title: string;
  estimatedMinutes: number;
  difficulty: ArticleDifficulty;
  status: ArticleStatus;
}

interface AdminComparisonRow {
  houseMakerId: string | null;
  priceRangeTag: string | null;
  featureTag: string | null;
  order: number;
}

interface AdminArticleDetail {
  id: string;
  phaseId: string;
  order: number;
  title: string;
  bodyMarkdown: string;
  estimatedMinutes: number;
  difficulty: ArticleDifficulty;
  translateBoxLabel: string | null;
  translateBoxValue: string | null;
  status: ArticleStatus;
  comparisonRows: AdminComparisonRow[];
}

const DIFFICULTY_LABEL: Record<ArticleDifficulty, string> = { BEGINNER: "入門", BASIC: "基礎" };
const COMPARISON_PHASE_KEY = "maker_selection";

function ArticleEditPanel({
  article,
  phase,
  houseMakers,
  hashtags,
  onSaved,
  onClose,
}: {
  article: AdminArticleDetail;
  phase: AdminPhase;
  houseMakers: HouseMakerOption[];
  hashtags: HashtagOption[];
  onSaved: (updated: AdminArticleListItem) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(article.title);
  const [bodyMarkdown, setBodyMarkdown] = useState(article.bodyMarkdown);
  const [estimatedMinutes, setEstimatedMinutes] = useState(article.estimatedMinutes);
  const [difficulty, setDifficulty] = useState<ArticleDifficulty>(article.difficulty);
  const [translateBoxLabel, setTranslateBoxLabel] = useState(article.translateBoxLabel ?? "");
  const [translateBoxValue, setTranslateBoxValue] = useState(article.translateBoxValue ?? "");
  const [rows, setRows] = useState<AdminComparisonRow[]>(article.comparisonRows);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const showComparisonEditor = phase.key === COMPARISON_PHASE_KEY;

  function addRow() {
    setRows((prev) => [...prev, { houseMakerId: null, priceRangeTag: "", featureTag: "", order: prev.length }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, patch: Partial<AdminComparisonRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function handleSave(nextStatus?: ArticleStatus) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/articles/${article.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        bodyMarkdown,
        estimatedMinutes,
        difficulty,
        translateBoxLabel: translateBoxLabel || null,
        translateBoxValue: translateBoxValue || null,
        ...(showComparisonEditor && { comparisonRows: rows }),
        ...(nextStatus && { status: nextStatus }),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ? JSON.stringify(body.error) : "保存に失敗しました");
      return;
    }
    const body = await res.json();
    onSaved({
      id: body.data.id,
      phaseId: body.data.phaseId,
      order: body.data.order,
      title: body.data.title,
      estimatedMinutes: body.data.estimatedMinutes,
      difficulty: body.data.difficulty,
      status: body.data.status,
    });
  }

  const previewArticle: ArticleDetailDTO = {
    id: article.id,
    phaseId: phase.id,
    order: article.order,
    title,
    bodyMarkdown,
    estimatedMinutes,
    difficulty,
    translateBoxLabel: translateBoxLabel || null,
    translateBoxValue: translateBoxValue || null,
    status: article.status,
    phase: { id: phase.id, key: phase.key, title: phase.title },
    comparisonRows: rows.map((row, i) => ({
      id: `preview-${i}`,
      priceRangeTag: row.priceRangeTag,
      featureTag: row.featureTag,
      order: row.order,
      houseMaker: houseMakers.find((hm) => hm.id === row.houseMakerId)
        ? { id: row.houseMakerId as string, name: houseMakers.find((hm) => hm.id === row.houseMakerId)!.name, logoUrl: null }
        : null,
    })),
  };

  if (showPreview) {
    return (
      <div className="mt-3 pt-3 border-t border-gray-700">
        <button
          type="button"
          onClick={() => setShowPreview(false)}
          className="mb-4 text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-300 hover:bg-gray-800"
        >
          ← 編集に戻る
        </button>
        <div className="bg-white rounded-xl p-6">
          <ArticleViewer article={previewArticle} prevHref={null} nextHref="/journey" previewMode />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">タイトル</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">本文（Markdown）</label>
        <textarea
          value={bodyMarkdown}
          onChange={(e) => setBodyMarkdown(e.target.value)}
          rows={10}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm font-mono resize-y"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">所要時間（分）</label>
          <input
            type="number"
            min={1}
            value={estimatedMinutes}
            onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">難易度</label>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as ArticleDifficulty)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
          >
            <option value="BEGINNER">入門</option>
            <option value="BASIC">基礎</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1">翻訳ボックス見出し</label>
          <input
            value={translateBoxLabel}
            onChange={(e) => setTranslateBoxLabel(e.target.value)}
            placeholder="つまりあなたにとっては"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">翻訳ボックス内容</label>
          <input
            value={translateBoxValue}
            onChange={(e) => setTranslateBoxValue(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
          />
        </div>
      </div>

      {showComparisonEditor && (
        <div className="space-y-2 bg-gray-800/60 rounded p-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">ざっくり比較表</label>
            <button
              type="button"
              onClick={addRow}
              className="text-xs px-2 py-1 rounded bg-gray-700 text-gray-200 hover:bg-gray-600"
            >
              + 行を追加
            </button>
          </div>
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={row.houseMakerId ?? ""}
                onChange={(e) => updateRow(i, { houseMakerId: e.target.value || null })}
                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
              >
                <option value="">メーカー未選択</option>
                {houseMakers.map((hm) => (
                  <option key={hm.id} value={hm.id}>{hm.name}</option>
                ))}
              </select>
              <input
                value={row.priceRangeTag ?? ""}
                onChange={(e) => updateRow(i, { priceRangeTag: e.target.value })}
                placeholder="価格帯"
                className="w-24 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
              />
              <select
                value={row.featureTag ?? ""}
                onChange={(e) => updateRow(i, { featureTag: e.target.value || null })}
                className="w-28 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
              >
                <option value="">特徴タグ未選択</option>
                {hashtags.map((tag) => (
                  <option key={tag.id} value={tag.tagName}>{tag.tagName}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="text-xs px-2 py-1 rounded bg-red-900/60 text-red-300 hover:bg-red-900"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => handleSave()}
          disabled={saving}
          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
        {article.status === "DRAFT" ? (
          <button
            type="button"
            onClick={() => handleSave("PUBLISHED")}
            disabled={saving}
            className="px-4 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
          >
            公開する
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSave("DRAFT")}
            disabled={saving}
            className="px-4 py-1.5 border border-gray-600 text-gray-300 text-xs rounded hover:bg-gray-800"
          >
            下書きに戻す
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="px-4 py-1.5 border border-gray-600 text-gray-300 text-xs rounded hover:bg-gray-800"
        >
          プレビュー
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 border border-gray-600 text-gray-300 text-xs rounded hover:bg-gray-800"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

function PhaseArticles({
  phase,
  houseMakers,
  hashtags,
}: {
  phase: AdminPhase;
  houseMakers: HouseMakerOption[];
  hashtags: HashtagOption[];
}) {
  const [articles, setArticles] = useState<AdminArticleListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDetail, setEditingDetail] = useState<AdminArticleDetail | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMinutes, setNewMinutes] = useState(3);
  const [newDifficulty, setNewDifficulty] = useState<ArticleDifficulty>("BEGINNER");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/articles?phaseId=${phase.id}`);
    if (res.ok) {
      const body = await res.json();
      setArticles(body.data ?? []);
    }
    setLoading(false);
  }, [phase.id]);

  useEffect(() => { load(); }, [load]);

  async function updateOrder(articleId: string, order: number) {
    await fetch(`/api/admin/articles/${articleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
  }

  async function openEdit(articleId: string) {
    if (editingId === articleId) {
      setEditingId(null);
      setEditingDetail(null);
      return;
    }
    const res = await fetch(`/api/admin/articles/${articleId}`);
    if (res.ok) {
      const body = await res.json();
      setEditingDetail(body.data);
      setEditingId(articleId);
    }
  }

  async function handleDelete(articleId: string) {
    const res = await fetch(`/api/admin/articles/${articleId}`, { method: "DELETE" });
    if (res.ok) {
      setArticles((prev) => prev.filter((a) => a.id !== articleId));
      if (editingId === articleId) { setEditingId(null); setEditingDetail(null); }
    }
    setPendingDeleteId(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setFormError(null);
    const res = await fetch("/api/admin/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phaseId: phase.id,
        order: articles.length,
        title: newTitle.trim(),
        bodyMarkdown: "本文を入力してください。",
        estimatedMinutes: newMinutes,
        difficulty: newDifficulty,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const body = await res.json();
      setFormError(body.error ? JSON.stringify(body.error) : "作成に失敗しました");
      return;
    }
    setNewTitle("");
    setShowForm(false);
    await load();
  }

  if (loading) return <div className="text-center py-4 text-gray-500 text-sm">読み込み中...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-200">「{phase.title}」の記事</h4>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white"
        >
          {showForm ? "閉じる" : "+ 記事を追加"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="記事タイトル"
            maxLength={200}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              min={1}
              value={newMinutes}
              onChange={(e) => setNewMinutes(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
            />
            <select
              value={newDifficulty}
              onChange={(e) => setNewDifficulty(e.target.value as ArticleDifficulty)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
            >
              <option value="BEGINNER">入門</option>
              <option value="BASIC">基礎</option>
            </select>
          </div>
          {formError && <p className="text-red-400 text-xs">{formError}</p>}
          <button
            type="submit"
            disabled={creating || !newTitle.trim()}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs rounded"
          >
            {creating ? "作成中..." : "作成する（下書き）"}
          </button>
        </form>
      )}

      {articles.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center">記事がありません</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {articles.map((a) => (
            <div key={a.id} className="py-2.5">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  defaultValue={a.order}
                  onBlur={(e) => updateOrder(a.id, Number(e.target.value))}
                  className="w-12 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white truncate">{a.title}</p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                        a.status === "PUBLISHED" ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {a.status === "PUBLISHED" ? "公開" : "下書き"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {DIFFICULTY_LABEL[a.difficulty]} · {a.estimatedMinutes}分
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(a.id)}
                  className="text-xs px-3 py-1 rounded bg-blue-800 hover:bg-blue-700 text-white shrink-0"
                >
                  {editingId === a.id ? "閉じる" : "編集"}
                </button>
                {pendingDeleteId === a.id ? (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDelete(a.id)}
                      className="text-xs px-2 py-1 rounded bg-red-700 hover:bg-red-600 text-white"
                    >
                      はい
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(null)}
                      className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-300"
                    >
                      いいえ
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(a.id)}
                    className="text-xs px-3 py-1 rounded border border-red-800 text-red-400 hover:bg-red-900/30 shrink-0"
                  >
                    削除
                  </button>
                )}
              </div>

              {editingId === a.id && editingDetail && (
                <ArticleEditPanel
                  article={editingDetail}
                  phase={phase}
                  houseMakers={houseMakers}
                  hashtags={hashtags}
                  onSaved={(updated) => {
                    setArticles((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                    setEditingDetail((prev) =>
                      prev
                        ? { ...prev, title: updated.title, estimatedMinutes: updated.estimatedMinutes, difficulty: updated.difficulty, status: updated.status }
                        : prev
                    );
                  }}
                  onClose={() => { setEditingId(null); setEditingDetail(null); }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function LearningContentManagerClient() {
  const [phases, setPhases] = useState<AdminPhase[]>([]);
  const [loading, setLoading] = useState(true);
  const [houseMakers, setHouseMakers] = useState<HouseMakerOption[]>([]);
  const [hashtags, setHashtags] = useState<HashtagOption[]>([]);
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/phases");
    if (res.ok) {
      const body = await res.json();
      setPhases(body.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    fetch("/api/house-makers").then(async (res) => {
      if (res.ok) setHouseMakers((await res.json()).data ?? []);
    });
    fetch("/api/hashtags?limit=100").then(async (res) => {
      if (res.ok) setHashtags((await res.json()).data ?? []);
    });
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey.trim() || !newTitle.trim()) return;
    setAdding(true);
    setError(null);
    const res = await fetch("/api/admin/phases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey.trim(), title: newTitle.trim(), order: phases.length }),
    });
    setAdding(false);
    if (res.ok) {
      setNewKey("");
      setNewTitle("");
      await load();
    } else {
      const body = await res.json();
      setError(body.error ? JSON.stringify(body.error) : "登録に失敗しました");
    }
  }

  async function handleToggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/phases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    await load();
  }

  async function updateOrder(id: string, order: number) {
    await fetch(`/api/admin/phases/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`「${title}」を削除しますか？（記事が存在する場合は削除できません）`)) return;
    const res = await fetch(`/api/admin/phases/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("削除できませんでした");
      return;
    }
    if (selectedPhaseId === id) setSelectedPhaseId(null);
    await load();
  }

  const selectedPhase = phases.find((p) => p.id === selectedPhaseId) ?? null;

  if (loading) return <div className="text-center py-6 text-gray-500">読み込み中...</div>;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-200">学習フェーズ</h3>
        <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="key（例: info_basic）"
            className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm placeholder-gray-500"
          />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="フェーズ名"
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={adding || !newKey.trim() || !newTitle.trim()}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm rounded"
          >
            {adding ? "追加中..." : "フェーズ追加"}
          </button>
        </form>
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {phases.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">フェーズがありません</p>
        ) : (
          <div className="divide-y divide-gray-800">
            {phases.map((phase) => (
              <div key={phase.id} className="flex items-center gap-3 py-2.5">
                <input
                  type="number"
                  min={0}
                  defaultValue={phase.order}
                  onBlur={(e) => updateOrder(phase.id, Number(e.target.value))}
                  className="w-12 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-white text-center"
                />
                <span className={`flex-1 text-sm ${phase.isActive ? "text-white" : "text-gray-500 line-through"}`}>
                  {phase.title}
                  <span className="text-gray-500 ml-2 text-xs">記事{phase._count.articles}件</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPhaseId(selectedPhaseId === phase.id ? null : phase.id)}
                  className={`text-xs px-3 py-1 rounded ${
                    selectedPhaseId === phase.id ? "bg-amber-600 text-white" : "bg-blue-800 hover:bg-blue-700 text-white"
                  }`}
                >
                  {selectedPhaseId === phase.id ? "閉じる" : "記事を管理"}
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActive(phase.id, phase.isActive)}
                  className={`text-xs px-2 py-1 rounded ${phase.isActive ? "bg-gray-700 text-gray-300" : "bg-green-900 text-green-300"}`}
                >
                  {phase.isActive ? "無効化" : "有効化"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(phase.id, phase.title)}
                  className="text-xs px-2 py-1 rounded bg-red-900/60 text-red-300 hover:bg-red-900"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedPhase && (
        <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700">
          <PhaseArticles phase={selectedPhase} houseMakers={houseMakers} hashtags={hashtags} />
        </div>
      )}
    </div>
  );
}
