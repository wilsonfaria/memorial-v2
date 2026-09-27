-- Full-text search over the newspapers: one row per PDF page (text layer or
-- OCR), with a FULLTEXT index used as the fallback when Meilisearch isn't
-- available (see src/lib/search). Replaces editions.extractedText, which was
-- never populated (empty on every database this app has run against).

-- AlterTable
ALTER TABLE `editions` DROP COLUMN `extractedText`;

-- CreateTable
CREATE TABLE `edition_pages` (
    `editionId` INTEGER NOT NULL,
    `page` INTEGER NOT NULL,
    `text` MEDIUMTEXT NOT NULL,
    `ocr` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    FULLTEXT INDEX `edition_pages_text_idx`(`text`),
    PRIMARY KEY (`editionId`, `page`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `edition_pages` ADD CONSTRAINT `edition_pages_editionId_fkey` FOREIGN KEY (`editionId`) REFERENCES `editions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
