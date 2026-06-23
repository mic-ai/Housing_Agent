"use client";

import { useState, useEffect, useCallback } from "react";

interface Company { id: string; name: string; }

interface Salesperson {
  id: string;
  name: string;
  email: string;
  role: "SALESPERSON" | "ADMIN";
  lineId: string | null;
  bio: string | null;
  company: Company;
  videoCount: number;
  inquiryCount: number;
  createdAt: string;
}

interface Props {
  initialCompanies: Company[];
}

export function SalespersonManagerClient({ initialCompanies }: Props) {
  const [salespersons, setSalespersons] = useState<Salesperson[]>([]);
  const [companies, setCompanies] = useState<Company[]>(initialCompanies);
  const [loading, setLoading] = useState(true);

  // 新規営業マンフォーム
  const [showSpForm, setShowSpForm] = useState(false);
  const [spSubmitting, setSpSubmitting] = useState(false);
  const [spError, setSpError] = useState("");

  // 新規会社フォーム
  const [showCompanyForm, setShowCompanyForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [companyAdding, setCompanyAdding] = useState(false);

  // パスワードリセット対象
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetError, setResetError] = useState("");

  const loadSalespersons = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/salespersons");
    if (res.ok) {
      const body = await res.json();
      setSalespersons(body.salespersons ?? []);
    }
    setLoading(false);
  }, []);

  const loadCompanies = useCallback(async () => {
    const res = await fetch("/api/admin/companies");
    if (res.ok) {
      const body = await res.json();
      setCompanies(body.companies?.map((c: Company & { _count?: unknown }) => ({ id: c.id, name: c.name })) ?? []);
    }
  }, []);

  useEffect(() => {
    loadSalespersons();
    loadCompanies();
  }, [loadSalespersons, loadCompanies]);

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setCompanyAdding(true);
    const res = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCompanyName.trim() }),
    });
    if (res.ok) {
      const body = await res.json();
      setCompanies((prev) => [...prev, body.company]);
      setNewCompanyName("");
      setShowCompanyForm(false);
    }
    setCompanyAdding(false);
  }

  async function handleAddSalesperson(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSpError("");
    setSpSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: fd.get("name") as string,
      email: fd.get("email") as string,
      password: fd.get("password") as string,
      companyId: fd.get("companyId") as string,
      role: fd.get("role") as string,
      bio: (fd.get("bio") as string) || undefined,
    };
    const res = await fetch("/api/admin/salespersons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSpSubmitting(false);
    if (!res.ok) {
      setSpError(data.error ?? "登録に失敗しました");
      return;
    }
    setSalespersons((prev) => [data.salesperson, ...prev]);
    setShowSpForm(false);
    (e.target as HTMLFormElement).reset();
  }

  async function handleDelete(sp: Salesperson) {
    if (!confirm(`「${sp.name}」を削除しますか？\nこの操作は取り消せません。`)) return;
    const res = await fetch(`/api/admin/salespersons/${sp.id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      alert(body.error ?? "削除できませんでした");
      return;
    }
    setSalespersons((prev) => prev.filter((s) => s.id !== sp.id));
  }

  async function handleResetPassword(salespersonId: string) {
    if (!newPassword || newPassword.length < 8) {
      setResetError("8文字以上で入力してください");
      return;
    }
    const res = await fetch(`/api/admin/salespersons/${salespersonId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (res.ok) {
      setResetTarget(null);
      setNewPassword("");
      setResetError("");
    }
  }

  async function handleToggleRole(sp: Salesperson) {
    const newRole = sp.role === "ADMIN" ? "SALESPERSON" : "ADMIN";
    const res = await fetch(`/api/admin/salespersons/${sp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (res.ok) {
      setSalespersons((prev) =>
        prev.map((s) => s.id === sp.id ? { ...s, role: newRole } : s)
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* 会社管理 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-400">会社一覧</h3>
          <button
            onClick={() => setShowCompanyForm((v) => !v)}
            className="text-xs px-3 py-1 border border-gray-600 text-gray-300 rounded hover:bg-gray-800"
          >
            {showCompanyForm ? "閉じる" : "会社を追加"}
          </button>
        </div>
        {showCompanyForm && (
          <form onSubmit={handleAddCompany} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="会社名"
              required
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={companyAdding}
              className="px-4 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50"
            >
              追加
            </button>
          </form>
        )}
        <div className="flex flex-wrap gap-2">
          {companies.map((c) => (
            <span key={c.id} className="text-xs bg-gray-800 text-gray-300 px-2.5 py-1 rounded-full border border-gray-700">
              {c.name}
            </span>
          ))}
          {companies.length === 0 && (
            <p className="text-xs text-gray-500">会社が登録されていません</p>
          )}
        </div>
      </div>

      <div className="border-t border-gray-700 pt-6">
        {/* 営業マン追加ボタン */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-400">
            営業マン一覧（{salespersons.length}名）
          </h3>
          <button
            onClick={() => { setShowSpForm((v) => !v); setSpError(""); }}
            className="text-sm px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors"
          >
            {showSpForm ? "閉じる" : "営業マンを追加"}
          </button>
        </div>

        {/* 新規追加フォーム */}
        {showSpForm && (
          <form onSubmit={handleAddSalesperson} className="bg-gray-800 rounded-xl p-5 space-y-4 mb-5 border border-gray-700">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">名前 *</label>
                <input name="name" required className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">メールアドレス *</label>
                <input name="email" type="email" required className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">パスワード（8文字以上）*</label>
                <input name="password" type="password" required minLength={8} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">会社 *</label>
                <select name="companyId" required className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                  <option value="">選択してください</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">ロール</label>
                <select name="role" defaultValue="SALESPERSON" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm">
                  <option value="SALESPERSON">営業マン</option>
                  <option value="ADMIN">管理者</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">自己紹介</label>
                <input name="bio" className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm" />
              </div>
            </div>
            {spError && <p className="text-red-400 text-sm">{spError}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={spSubmitting}
                className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium rounded">
                {spSubmitting ? "登録中..." : "登録する"}
              </button>
              <button type="button" onClick={() => setShowSpForm(false)}
                className="px-6 py-2 border border-gray-600 text-gray-300 text-sm rounded hover:bg-gray-800">
                キャンセル
              </button>
            </div>
          </form>
        )}

        {/* 営業マン一覧 */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">読み込み中...</div>
        ) : salespersons.length === 0 ? (
          <p className="text-center text-gray-500 py-8 text-sm">営業マンが登録されていません</p>
        ) : (
          <div className="divide-y divide-gray-700">
            {salespersons.map((sp) => (
              <div key={sp.id} className="py-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-medium">{sp.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${sp.role === "ADMIN" ? "bg-yellow-900/60 text-yellow-300" : "bg-gray-800 text-gray-400"}`}>
                        {sp.role === "ADMIN" ? "管理者" : "営業マン"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{sp.email}</p>
                    <p className="text-xs text-gray-500">{sp.company.name} · 動画 {sp.videoCount}件 · 問い合わせ {sp.inquiryCount}件</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => { setResetTarget(sp.id); setNewPassword(""); setResetError(""); }}
                      className="text-xs px-2 py-1 border border-gray-600 text-gray-400 rounded hover:bg-gray-800"
                    >
                      PW変更
                    </button>
                    <button
                      onClick={() => handleToggleRole(sp)}
                      className="text-xs px-2 py-1 border border-gray-600 text-gray-400 rounded hover:bg-gray-800"
                    >
                      {sp.role === "ADMIN" ? "一般に変更" : "管理者に変更"}
                    </button>
                    <button
                      onClick={() => handleDelete(sp)}
                      className="text-xs px-2 py-1 bg-red-900/60 text-red-300 rounded hover:bg-red-900"
                    >
                      削除
                    </button>
                  </div>
                </div>

                {/* パスワードリセット行 */}
                {resetTarget === sp.id && (
                  <div className="mt-2 flex gap-2 items-center">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="新しいパスワード（8文字以上）"
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-white text-sm placeholder-gray-500"
                    />
                    <button
                      onClick={() => handleResetPassword(sp.id)}
                      className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
                    >
                      変更
                    </button>
                    <button
                      onClick={() => { setResetTarget(null); setNewPassword(""); setResetError(""); }}
                      className="px-3 py-1.5 border border-gray-600 text-gray-400 text-sm rounded hover:bg-gray-800"
                    >
                      ✕
                    </button>
                    {resetError && <p className="text-red-400 text-xs">{resetError}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
