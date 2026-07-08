-- DropForeignKey
ALTER TABLE "salespersons" DROP CONSTRAINT "salespersons_companyId_fkey";

-- AddForeignKey
ALTER TABLE "salespersons" ADD CONSTRAINT "salespersons_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
