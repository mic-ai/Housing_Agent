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
    $transaction: vi.fn((callback: (tx: unknown) => unknown) => {
      const tx = {
        video: { create: vi.fn(), update: vi.fn() },
        hashtag: { upsert: vi.fn() },
        videoHashtag: { create: vi.fn(), deleteMany: vi.fn() },
        user: { create: vi.fn() },
        contactRequest: { create: vi.fn() },
      };
      return callback(tx);
    }),
    video: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    salesperson: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    salespersonProfileVideo: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    houseMaker: {
      findMany: vi.fn(),
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
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
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
  buildSalespersonFaceVideoPath: vi.fn((spId: string, type: string, ext: string) =>
    `${spId}/${type}_123.${ext}`
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
