import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const houseMaker = await prisma.houseMaker.upsert({
    where: { name: "サンプルハウス" },
    update: {},
    create: { name: "サンプルハウス", isActive: true },
  });

  const venue = await prisma.venue.upsert({
    where: { name: "テスト展示場" },
    update: {},
    create: { name: "テスト展示場", address: "東京都渋谷区3-3-3", isActive: true },
  });

  const company = await prisma.company.upsert({
    where: { id: "co_test_001" },
    update: {},
    create: {
      id: "co_test_001",
      name: "テスト住宅株式会社",
      address: "東京都渋谷区1-1-1",
      modelHouseName: "テストモデルハウス",
      modelHouseAddress: "東京都渋谷区2-2-2",
    },
  });

  const password = await bcrypt.hash("password123", 10);

  await prisma.salesperson.upsert({
    where: { email: "sales@test.example.com" },
    update: {},
    create: {
      id: "sp_test_001",
      name: "テスト営業太郎",
      email: "sales@test.example.com",
      password,
      role: "SALESPERSON",
      companyId: company.id,
      toneQuote: "住宅営業歴10年のベテランです。",
    },
  });

  await prisma.salesperson.upsert({
    where: { email: "admin@test.example.com" },
    update: {},
    create: {
      id: "sp_admin_001",
      name: "管理者ユーザー",
      email: "admin@test.example.com",
      password,
      role: "ADMIN",
      companyId: company.id,
    },
  });

  const video = await prisma.video.upsert({
    where: { id: "vid_test_001" },
    update: {},
    create: {
      id: "vid_test_001",
      platform: "YOUTUBE",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      title: "おしゃれなリビングのある家",
      description: "20坪のコンパクトながら開放感のある設計です。",
      houseMakerId: houseMaker.id,
      venueId: venue.id,
      isActive: true,
    },
  });

  const hashtag = await prisma.hashtag.upsert({
    where: { tagName: "新着" },
    update: { usageCount: { increment: 1 } },
    create: { tagName: "新着", usageCount: 1 },
  });

  await prisma.videoHashtag.upsert({
    where: { videoId_hashtagId: { videoId: video.id, hashtagId: hashtag.id } },
    update: {},
    create: { videoId: video.id, hashtagId: hashtag.id },
  });

  await prisma.salespersonVideo.upsert({
    where: { videoId_salespersonId: { videoId: video.id, salespersonId: "sp_test_001" } },
    update: {},
    create: {
      videoId: video.id,
      salespersonId: "sp_test_001",
      isPrimary: true,
    },
  });

  const user = await prisma.user.upsert({
    where: { id: "user_test_001" },
    update: {},
    create: {
      id: "user_test_001",
      name: "テストユーザー",
      email: "user@test.example.com",
    },
  });

  await prisma.availableSlot.upsert({
    where: { id: "slot_test_001" },
    update: {},
    create: {
      id: "slot_test_001",
      salespersonId: "sp_test_001",
      startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
      isBooked: false,
    },
  });

  await prisma.contactRequest.upsert({
    where: { id: "cr_test_001" },
    update: {},
    create: {
      id: "cr_test_001",
      userId: user.id,
      salespersonId: "sp_test_001",
      videoId: video.id,
      contactMethod: "EMAIL",
      status: "PENDING",
    },
  });

  // P-05 テスト用: 予約確定済み ContactRequest + Appointment
  await prisma.contactRequest.upsert({
    where: { id: "cr_test_002" },
    update: {},
    create: {
      id: "cr_test_002",
      userId: user.id,
      salespersonId: "sp_test_001",
      videoId: video.id,
      contactMethod: "EMAIL",
      status: "APPOINTED",
    },
  });

  await prisma.appointment.upsert({
    where: { contactRequestId: "cr_test_002" },
    update: {},
    create: {
      contactRequestId: "cr_test_002",
      salespersonId: "sp_test_001",
      userId: user.id,
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: "CONFIRMED",
    },
  });

  await prisma.learningPhase.upsert({
    where: { key: "info_basic" },
    update: {},
    create: {
      key: "info_basic",
      title: "① 情報収集の基礎",
      order: 0,
      description: "立地・相場価格・ローンの借り方など、家づくりの最初の一歩を学びます。",
    },
  });

  await prisma.learningPhase.upsert({
    where: { key: "maker_selection" },
    update: {},
    create: {
      key: "maker_selection",
      title: "② メーカー選びの基礎",
      order: 1,
      description: "ハウスメーカーをどう比較・検討すればよいかを学びます。",
    },
  });

  console.log("Seed completed:", { company: company.name, video: video.title, user: user.name, houseMaker: houseMaker.name, venue: venue.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
