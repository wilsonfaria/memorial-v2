-- CreateTable
CREATE TABLE `photo_caption_suggestions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `photoId` INTEGER NOT NULL,
    `suggestion` TEXT NOT NULL,
    `submitterName` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `photo_caption_suggestions_photoId_idx`(`photoId`),
    INDEX `photo_caption_suggestions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `photo_caption_suggestions` ADD CONSTRAINT `photo_caption_suggestions_photoId_fkey` FOREIGN KEY (`photoId`) REFERENCES `gallery_photos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
