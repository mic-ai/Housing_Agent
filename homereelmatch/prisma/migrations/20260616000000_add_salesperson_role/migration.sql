-- CreateEnum
CREATE TYPE "SalespersonRole" AS ENUM ('SALESPERSON', 'ADMIN');

-- AlterTable
ALTER TABLE "salespersons" ADD COLUMN "role" "SalespersonRole" NOT NULL DEFAULT 'SALESPERSON';
