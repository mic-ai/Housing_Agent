"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  AgentKnowledgeEntryDetailDTO,
  AgentKnowledgeEntryListItemDTO,
  AgentKnowledgeStatus,
} from "@/types";

const SUGGESTED_CATEGORIES = ["工法", "価格帯", "検討ポイント", "その他"];

function AgentKnowledgeEditPanel({
  entry,
  onSaved,
  onClose,
}: {
  entry: AgentKnowledgeEntryDetailDTO;
  onSaved: (updated: AgentKnowledgeEntryListItemDTO) => void;
  onClose: () => void;
}) {
  const [topic, setTopic] = useState(entry.topic);
  const [category, setCategory] = useState(entry.category);
  const [title, setTitle] = useState(entry.title);
  const [bodyMarkdown, setBodyMarkdown] = useState(entry.bodyMarkdown);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(nextStatus?: AgentKnowledgeStatus) {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/agent-knowledge/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        category,
        title,
        bodyMarkdown,
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
      topic: body.data.topic,
      category: body.data.category,
      title: body.data.title,
      status: body.data.status,
    });
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">トピック</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={200}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">カテゴリ</label>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          maxLength={50}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">見出し</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          本文（Markdown・チャットAIが根拠として参照します。特定企業名を含めないでください）
        </label>
        <textarea
          value={bodyMarkdown}
          onChange={(e) => setBodyMarkdown(e.target.value)}
          rows={10}
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm font-mono resize-y"
        />
      </div>

      {entry.sources.length > 0 && (
        <div className="bg-gray-800/60 rounded p-3 space-y-1">
          <p className="text-xs text-gray-400">
            Web検索により生成された下書きです。内容を確認のうえ公開してください。参照した情報源:
          </p>
          <ul className="space-y-0.5">
            {entry.sources.map((source) => (
              <li key={source.id} className="text-xs">
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-500 underline break-all"
                >
                  {source.title || source.url}
                </a>
              </li>
            ))}
          </ul>
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
        {entry.status === "DRAFT" ? (
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
          onClick={onClose}
          className="px-4 py-1.5 border border-gray-600 text-gray-300 text-xs rounded hover:bg-gray-800"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}

export function AgentKnowledgeManagerClient() {
  const [entries, setEntries] = useState<AgentKnowledgeEntryListItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDetail, setEditingDetail] = useState<AgentKnowledgeEntryDetailDTO | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [newTopic, setNewTopic] = useState("");
  const [newCategory, setNewCategory] = useState(SUGGESTED_CATEGORIES[0]);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genCategory, setGenCategory] = useState(SUGGESTED_CATEGORIES[0]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/agent-knowledge");
    if (res.ok) {
      const body = await res.json();
      setEntries(body.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openEdit(id: string) {
    if (editingId === id) {
      setEditingId(null);
      setEditingDetail(null);
      return;
    }
    const res = await fetch(`/api/admin/agent-knowledge/${id}`);
    if (res.ok) {
      const body = await res.json();
      setEditingDetail(body.data);
      setEditingId(id);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/agent-knowledge/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setEditingDetail(null);
      }
    }
    setPendingDeleteId(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTopic.trim() || !newTitle.trim()) return;
    setCreating(true);
    setFormError(null);
    const res = await fetch("/api/admin/agent-knowledge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: newTopic.trim(),
        category: newCategory,
        title: newTitle.trim(),
        bodyMarkdown: "本文を入力してください。",
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const body = await res.json();
      setFormError(body.error ? JSON.stringify(body.error) : "作成に失敗しました");
      return;
    }
    setNewTopic("");
    setNewTitle("");
    setShowForm(false);
    await load();
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!genTopic.trim()) return;
    setGenerating(true);
    setGenError(null);
    const res = await fetch("/api/admin/agent-knowledge/generate-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: genTopic.trim(), category: genCategory }),
    });
    setGenerating(false);
    if (!res.ok) {
      const body = await res.json();
      setGenError(typeof body.error === "string" ? body.error : "生成に失敗しました");
      return;
    }
    const body = await res.json();
    setGenTopic("");
    setShowGenerateForm(false);
    await load();
    await openEdit(body.data.id);
  }

  if (loading) return <div className="text-center py-4 text-gray-500 text-sm">読み込み中...</div>;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">
        ここで公開したナレッジは、公開ページのAIチャットエージェントが回答の根拠として参照します。特定の住宅メーカー・工務店名を本文に含めないでください。
      </p>

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-200">AIエージェント ナレッジ一覧</h4>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowGenerateForm((v) => !v)}
            className="text-xs px-3 py-1.5 rounded bg-purple-700 hover:bg-purple-600 text-white"
          >
            {showGenerateForm ? "閉じる" : "Web下書き生成"}
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white"
          >
            {showForm ? "閉じる" : "+ ナレッジを追加"}
          </button>
        </div>
      </div>

      {showGenerateForm && (
        <form onSubmit={handleGenerate} className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              トピック（Web検索で公的機関の情報等を優先的に収集し、下書きを自動生成します）
            </label>
            <input
              value={genTopic}
              onChange={(e) => setGenTopic(e.target.value)}
              placeholder="例: 木造軸組工法の基礎知識"
              maxLength={200}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">カテゴリ</label>
            <select
              value={genCategory}
              onChange={(e) => setGenCategory(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
            >
              {SUGGESTED_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          {genError && <p className="text-red-400 text-xs">{genError}</p>}
          <button
            type="submit"
            disabled={generating || !genTopic.trim()}
            className="px-4 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white text-xs rounded"
          >
            {generating ? "生成中...（数十秒かかることがあります）" : "下書きを生成する"}
          </button>
        </form>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
          <input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            placeholder="トピック"
            maxLength={200}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
          />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="見出し"
            maxLength={200}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm"
          >
            {SUGGESTED_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          {formError && <p className="text-red-400 text-xs">{formError}</p>}
          <button
            type="submit"
            disabled={creating || !newTopic.trim() || !newTitle.trim()}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs rounded"
          >
            {creating ? "作成中..." : "作成する（下書き）"}
          </button>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center">ナレッジがありません</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {entries.map((entry) => (
            <div key={entry.id} className="py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white truncate">{entry.title}</p>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${
                        entry.status === "PUBLISHED" ? "bg-green-900 text-green-300" : "bg-gray-800 text-gray-400"
                      }`}
                    >
                      {entry.status === "PUBLISHED" ? "公開" : "下書き"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {entry.category} · {entry.topic}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(entry.id)}
                  className="text-xs px-3 py-1 rounded bg-blue-800 hover:bg-blue-700 text-white shrink-0"
                >
                  {editingId === entry.id ? "閉じる" : "編集"}
                </button>
                {pendingDeleteId === entry.id ? (
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.id)}
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
                    onClick={() => setPendingDeleteId(entry.id)}
                    className="text-xs px-3 py-1 rounded border border-red-800 text-red-400 hover:bg-red-900/30 shrink-0"
                  >
                    削除
                  </button>
                )}
              </div>

              {editingId === entry.id && editingDetail && (
                <AgentKnowledgeEditPanel
                  entry={editingDetail}
                  onSaved={(updated) => {
                    setEntries((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
                    setEditingDetail((prev) =>
                      prev
                        ? {
                            ...prev,
                            topic: updated.topic,
                            category: updated.category,
                            title: updated.title,
                            status: updated.status,
                          }
                        : prev
                    );
                  }}
                  onClose={() => {
                    setEditingId(null);
                    setEditingDetail(null);
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
