-- AlterTable
ALTER TABLE `edition_pages` ADD COLUMN `entitiesAt` DATETIME(3) NULL,
    ADD COLUMN `entitiesError` TEXT NULL;

-- CreateTable
CREATE TABLE `articles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `editionId` INTEGER NOT NULL,
    `page` INTEGER NOT NULL,
    `position` INTEGER NOT NULL,
    `title` VARCHAR(500) NOT NULL,
    `kind` VARCHAR(20) NOT NULL,
    `summary` TEXT NOT NULL,
    `model` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `articles_editionId_page_idx`(`editionId`, `page`),
    INDEX `articles_kind_idx`(`kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `kind` VARCHAR(10) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `key` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `mentionCount` INTEGER NOT NULL DEFAULT 0,
    `firstDate` DATETIME(3) NULL,
    `lastDate` DATETIME(3) NULL,

    INDEX `entities_kind_mentionCount_idx`(`kind`, `mentionCount`),
    UNIQUE INDEX `entities_kind_key_key`(`kind`, `key`),
    UNIQUE INDEX `entities_kind_slug_key`(`kind`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `entity_mentions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `articleId` INTEGER NOT NULL,
    `entityId` INTEGER NOT NULL,
    `surface` VARCHAR(255) NOT NULL,
    `honorific` VARCHAR(30) NULL,
    `role` VARCHAR(100) NULL,

    INDEX `entity_mentions_entityId_idx`(`entityId`),
    INDEX `entity_mentions_articleId_idx`(`articleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `articles` ADD CONSTRAINT `articles_editionId_fkey` FOREIGN KEY (`editionId`) REFERENCES `editions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entity_mentions` ADD CONSTRAINT `entity_mentions_articleId_fkey` FOREIGN KEY (`articleId`) REFERENCES `articles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `entity_mentions` ADD CONSTRAINT `entity_mentions_entityId_fkey` FOREIGN KEY (`entityId`) REFERENCES `entities`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

