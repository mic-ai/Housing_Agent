-- AlterTable
ALTER TABLE "salespersons" ADD COLUMN "valuesStatement" TEXT,
ADD COLUMN "toneQuote" TEXT,
ADD COLUMN "yearsExperience" INTEGER,
ADD COLUMN "handoverCount" INTEGER;

-- CreateTable
CREATE TABLE "salesperson_qa_items" (
    "id" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answerText" TEXT NOT NULL,
    "answerVideoUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salesperson_qa_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "salesperson_qa_items" ADD CONSTRAINT "salesperson_qa_items_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "salespersons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
