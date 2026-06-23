-- AlterTable: companyId を nullable に変更（会社=ハウスメーカーへの移行）
ALTER TABLE "salespersons" ALTER COLUMN "companyId" DROP NOT NULL;
