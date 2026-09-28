-- AlterTable
ALTER TABLE `edition_pages` ADD COLUMN `verifiedAt` DATETIME(3) NULL,
    ADD COLUMN `verifiedBy` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `page_text_versions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `editionId` INTEGER NOT NULL,
    `page` INTEGER NOT NULL,
    `text` MEDIUMTEXT NOT NULL,
    `source` VARCHAR(10) NOT NULL,
    `model` VARCHAR(191) NULL,
    `author` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `page_text_versions_editionId_page_createdAt_idx`(`editionId`, `page`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `edition_pages_verifiedAt_idx` ON `edition_pages`(`verifiedAt`);

-- AddForeignKey
ALTER TABLE `page_text_versions` ADD CONSTRAINT `page_text_versions_editionId_fkey` FOREIGN KEY (`editionId`) REFERENCES `editions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Seed the history with the AI transcriptions made before it existed.
INSERT INTO `page_text_versions` (`editionId`, `page`, `text`, `source`, `model`, `createdAt`)
SELECT `editionId`, `page`, `revisedText`, 'ai', `revisedModel`, `revisedAt`
FROM `edition_pages`
WHERE `revisedText` IS NOT NULL;
