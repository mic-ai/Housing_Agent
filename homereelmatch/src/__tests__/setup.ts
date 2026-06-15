import "@testing-library/jest-dom";
import { vi } from "vitest";

// Next.js navigation mocks
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
  redirect: vi.fn(),
}));

// Next.js headers mock
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
  headers: vi.fn(() => new Headers()),
}));

// Prisma mock
vi.mock("@/lib/prisma", () => ({
  prisma: {
    video: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    salesperson: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    salespersonVideo: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    hashtag: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    videoHashtag: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    contactRequest: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    availableSlot: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    appointment: {
      create: vi.fn(),
    },
  },
}));

// Supabase storage mock
vi.mock("@/lib/storage", () => ({
  uploadFaceVideo: vi.fn(),
  deleteFaceVideo: vi.fn(),
  getFaceVideoPublicUrl: vi.fn(),
  buildFaceVideoPath: vi.fn((spId: string, vId: string, type: string, ext: string) =>
    `${spId}/${vId}/${type}_123.${ext}`
  ),
}));

// next-auth mock
vi.mock("next-auth", () => ({
  default: vi.fn(),
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  authOptions: {},
}));
