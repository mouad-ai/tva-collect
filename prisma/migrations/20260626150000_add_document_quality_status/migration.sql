CREATE TYPE "DocumentQualityStatus" AS ENUM ('UNREVIEWED', 'VALID', 'WRONG_DOCUMENT', 'UNREADABLE', 'DUPLICATE', 'MISSING_PAGE', 'NOT_TVA');

ALTER TABLE "UploadedDocument"
  ADD COLUMN "qualityStatus" "DocumentQualityStatus" NOT NULL DEFAULT 'UNREVIEWED',
  ADD COLUMN "accountantComment" TEXT;
