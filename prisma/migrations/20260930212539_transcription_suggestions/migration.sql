-- CreateTable
CREATE TABLE `transcription_suggestions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `editionId` INTEGER NOT NULL,
    `page` INTEGER NOT NULL,
    `occurrence` INTEGER NOT NULL,
    `contextBefore` VARCHAR(200) NOT NULL,
    `contextAfter` VARCHAR(200) NOT NULL,
    `suggestion` VARCHAR(200) NOT NULL,
    `submitterName` VARCHAR(100) NULL,
    `status` VARCHAR(10) NOT NULL DEFAULT 'pending',
    `reviewedBy` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `transcription_suggestions_status_idx`(`status`),
    INDEX `transcription_suggestions_editionId_page_idx`(`editionId`, `page`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transcription_suggestions` ADD CONSTRAINT `transcription_suggestions_editionId_fkey` FOREIGN KEY (`editionId`) REFERENCES `editions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
