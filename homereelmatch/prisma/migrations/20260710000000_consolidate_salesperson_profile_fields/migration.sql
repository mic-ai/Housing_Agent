-- データ保全: bio → toneQuote（60字に切り詰め、toneQuote未設定の場合のみ）
UPDATE "salespersons" SET "toneQuote" = LEFT("bio", 60)
WHERE "toneQuote" IS NULL AND "bio" IS NOT NULL AND "bio" != '';

-- データ保全: valuesStatement → profileDetail（末尾に追記）
UPDATE "salespersons" SET "profileDetail" = CASE
  WHEN "profileDetail" IS NULL OR "profileDetail" = '' THEN "valuesStatement"
  ELSE "profileDetail" || E'\n\n' || "valuesStatement"
END
WHERE "valuesStatement" IS NOT NULL AND "valuesStatement" != '';

-- DropForeignKey
ALTER TABLE "salesperson_qa_items" DROP CONSTRAINT "salesperson_qa_items_salespersonId_fkey";

-- DropForeignKey
ALTER TABLE "salesperson_profile_videos" DROP CONSTRAINT "salesperson_profile_videos_salespersonId_fkey";

-- DropTable
DROP TABLE "salesperson_qa_items";

-- DropTable
DROP TABLE "salesperson_profile_videos";

-- AlterTable
ALTER TABLE "salespersons"
DROP COLUMN "bio",
DROP COLUMN "valuesStatement",
ADD COLUMN "introVideoUrl" TEXT,
ADD COLUMN "introVideoStoragePath" TEXT,
ADD COLUMN "introVideoDurationSec" INTEGER;
