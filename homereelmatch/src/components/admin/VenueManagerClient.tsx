"use client";

import { useState, useEffect, useCallback } from "react";

interface Venue {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
}

export function VenueManagerClient() {
  const [items, setItems] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/venues");
    if (res.ok) {
      const body = await res.json();
      setItems(body.data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    const res = await fetch("/api/admin/venues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), address: newAddress.trim() || undefined }),
    });
    setAdding(false);
    if (res.ok) {
      setNewName("");
      setNewAddress("");
      await load();
    } else {
      const body = await res.json();
      setError(body.error ?? "登録に失敗しました");
    }
  }

  async function handleToggle(id: string, current: boolean) {
    await fetch(`/api/admin/venues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    await load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    const res = await fetch(`/api/admin/venues/${id}`, { method: "DELETE" });
    if (!res.ok) {
      alert("削除できませんでした（動画に紐づいている可能性があります）");
      return;
    }
    await load();
  }

  if (loading) return <div className="text-center py-6 text-gray-500">読み込み中...</div>;

  return (
    <div className="space-y-4">
      <form onSubmit={handleAdd} className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="会場名"
            maxLength={100}
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={adding || !newName.trim()}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? "追加中..." : "追加"}
          </button>
        </div>
        <input
          type="text"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          placeholder="住所（任意）"
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm placeholder-gray-500"
        />
      </form>
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {items.length === 0 ? (
        <p className="text-gray-500 text-sm py-4 text-center">登録されていません</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.isActive ? "text-white" : "text-gray-500 line-through"}`}>
                  {item.name}
                </p>
                {item.address && (
                  <p className="text-xs text-gray-500 truncate">{item.address}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleToggle(item.id, item.isActive)}
                className={`text-xs px-2 py-1 rounded shrink-0 ${item.isActive ? "bg-gray-700 text-gray-300" : "bg-green-900 text-green-300"}`}
              >
                {item.isActive ? "無効化" : "有効化"}
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id, item.name)}
                className="text-xs px-2 py-1 rounded shrink-0 bg-red-900/60 text-red-300 hover:bg-red-900"
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
