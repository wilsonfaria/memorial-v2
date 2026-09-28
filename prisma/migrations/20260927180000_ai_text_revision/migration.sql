-- AI transcription of each page read from the page image (Gemini), stored
-- next to the original OCR text — which is never overwritten. The FULLTEXT
-- fallback index now covers both columns (see src/lib/search/search.ts).

-- DropIndex
DROP INDEX `edition_pages_text_idx` ON `edition_pages`;

-- AlterTable
ALTER TABLE `edition_pages` ADD COLUMN `revisedAt` DATETIME(3) NULL,
    ADD COLUMN `revisedModel` VARCHAR(191) NULL,
    ADD COLUMN `revisedText` MEDIUMTEXT NULL,
    ADD COLUMN `revisionError` TEXT NULL;

-- CreateIndex
CREATE INDEX `edition_pages_revisedAt_idx` ON `edition_pages`(`revisedAt`);

-- CreateIndex
CREATE FULLTEXT INDEX `edition_pages_text_revisedText_idx` ON `edition_pages`(`text`, `revisedText`);
