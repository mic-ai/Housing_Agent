-- Baseline migration: 過去に `prisma db push` で本番DBへ直接反映され、
-- マイグレーション履歴に記録されていなかった変更を追いつかせるための記録専用マイグレーション。
-- `prisma migrate resolve --applied` で適用済みとして記録するために作成しており、
-- 既存のNeon本番DBに対してこのSQLが実行されることは想定していない
-- （空のDBから prisma migrate deploy を実行する場合にのみ実際に実行される）。

-- CreateTable
CREATE TABLE "salesperson_face_videos" (
    "id" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "rollType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salesperson_face_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salesperson_profile_videos" (
    "id" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "title" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salesperson_profile_videos_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "salespersons" ADD COLUMN "houseMakerId" TEXT;

-- AlterTable
ALTER TABLE "salespersons" ALTER COLUMN "password" DROP DEFAULT;

-- AlterTable
ALTER TABLE "videos" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "salespersons" ADD CONSTRAINT "salespersons_houseMakerId_fkey" FOREIGN KEY ("houseMakerId") REFERENCES "house_makers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salesperson_face_videos" ADD CONSTRAINT "salesperson_face_videos_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "salespersons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salesperson_profile_videos" ADD CONSTRAINT "salesperson_profile_videos_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "salespersons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
