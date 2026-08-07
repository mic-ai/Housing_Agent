import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { uploadKnowledgeSourceFile } from "@/lib/storage";
import { POST } from "@/app/api/admin/agent-knowledge/source-groups/[groupId]/sources/upload/route";

const ADMIN_SESSION = {
  user: { id: "admin1", name: "管理者", email: "admin@example.com", role: "ADMIN" as const, companyId: "co1" },
  expires: "2099-01-01T00:00:00.000Z",
};

// "%PDF-1.4\n" 実マジックバイト（looksLikeAllowedPdfが要求する）
const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a]);

function makeParams(groupId: string) {
  return { params: Promise.resolve({ groupId }) };
}

function makeFormData(overrides: { file?: File; title?: string }) {
  const defaults = { file: new File([PDF_BYTES], "doc.pdf", { type: "application/pdf" }) };
  const params = { ...defaults, ...overrides };
  const fd = new FormData();
  fd.append("file", params.file);
  if (params.title) fd.append("title", params.title);
  return fd;
}

function makeRequest(fd: FormData) {
  return new NextRequest("http://localhost/api/admin/agent-knowledge/source-groups/g1/sources/upload", {
    method: "POST",
    body: fd,
  });
}

describe("POST /api/admin/agent-knowledge/source-groups/[groupId]/sources/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(ADMIN_SESSION as never);
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue({ id: "g1" } as never);
    vi.mocked(uploadKnowledgeSourceFile).mockResolvedValue({
      path: "knowledge-sources/g1/123.pdf",
      publicUrl: "https://storage.example.com/knowledge-sources/g1/123.pdf",
    });
    vi.mocked(prisma.agentKnowledgeRegisteredSource.create).mockResolvedValue({ id: "s1" } as never);
  });

  it("未認証は401を返す", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);
    const res = await POST(makeRequest(makeFormData({})), makeParams("g1"));
    expect(res.status).toBe(401);
  });

  it("存在しないグループは404を返す", async () => {
    vi.mocked(prisma.agentKnowledgeSourceGroup.findUnique).mockResolvedValue(null);
    const res = await POST(makeRequest(makeFormData({})), makeParams("missing"));
    expect(res.status).toBe(404);
  });

  it("ファイル無しは400を返す", async () => {
    const res = await POST(makeRequest(new FormData()), makeParams("g1"));
    expect(res.status).toBe(400);
  });

  it("MIMEがapplication/pdf以外は400を返す", async () => {
    const file = new File(["x"], "doc.png", { type: "image/png" });
    const res = await POST(makeRequest(makeFormData({ file })), makeParams("g1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid file type/i);
  });

  it("15MBを超えるファイルは400を返す", async () => {
    const fakeFile = {
      type: "application/pdf",
      size: 15 * 1024 * 1024 + 1,
      name: "big.pdf",
      arrayBuffer: async () => PDF_BYTES.buffer,
    };
    const req = new NextRequest("http://localhost/x", { method: "POST" });
    vi.spyOn(req, "formData").mockResolvedValueOnce({
      get: (key: string) => ({ file: fakeFile, title: null } as Record<string, unknown>)[key] ?? null,
    } as unknown as FormData);

    const res = await POST(req, makeParams("g1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/15MB/i);
  });

  it("マジックバイトが%PDF-で始まらない場合は400を返す（MIME偽装対策）", async () => {
    const file = new File(["not a real pdf"], "fake.pdf", { type: "application/pdf" });
    const res = await POST(makeRequest(makeFormData({ file })), makeParams("g1"));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Invalid file content/i);
  });

  it("有効なPDFをアップロードすると201でソースを作成する", async () => {
    const res = await POST(makeRequest(makeFormData({ title: "国交省資料" })), makeParams("g1"));
    expect(res.status).toBe(201);
    expect(prisma.agentKnowledgeRegisteredSource.create).toHaveBeenCalledWith({
      data: {
        groupId: "g1",
        sourceType: "PDF",
        storagePath: "knowledge-sources/g1/123.pdf",
        publicUrl: "https://storage.example.com/knowledge-sources/g1/123.pdf",
        fileName: "doc.pdf",
        title: "国交省資料",
      },
    });
  });
});
