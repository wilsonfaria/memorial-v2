-- CreateTable
CREATE TABLE `page_embeddings` (
    `editionId` INTEGER NOT NULL,
    `page` INTEGER NOT NULL,
    `textHash` CHAR(64) NOT NULL,
    `model` VARCHAR(64) NOT NULL,
    `chunks` JSON NOT NULL,
    `vectors` MEDIUMBLOB NOT NULL,
    `error` TEXT NULL,
    `embeddedAt` DATETIME(3) NOT NULL,

    INDEX `page_embeddings_embeddedAt_idx`(`embeddedAt`),
    PRIMARY KEY (`editionId`, `page`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `page_embeddings` ADD CONSTRAINT `page_embeddings_editionId_fkey` FOREIGN KEY (`editionId`) REFERENCES `editions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
