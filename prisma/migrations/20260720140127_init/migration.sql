-- CreateTable
CREATE TABLE `newspapers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `newspapers_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `decades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `startYear` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `newspaperId` INTEGER NOT NULL,

    UNIQUE INDEX `decades_newspaperId_startYear_key`(`newspaperId`, `startYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `years` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `decadeId` INTEGER NOT NULL,

    UNIQUE INDEX `years_decadeId_year_key`(`decadeId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `months` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `month` INTEGER NOT NULL,
    `yearId` INTEGER NOT NULL,

    UNIQUE INDEX `months_yearId_month_key`(`yearId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `editions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `editionNumber` INTEGER NULL,
    `publishedAt` DATETIME(3) NOT NULL,
    `pdfPath` VARCHAR(191) NOT NULL,
    `thumbnailPath` VARCHAR(191) NULL,
    `fileSizeBytes` INTEGER NULL,
    `pageCount` INTEGER NULL,
    `monthId` INTEGER NOT NULL,
    `extractedText` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `editions_publishedAt_idx`(`publishedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `decades` ADD CONSTRAINT `decades_newspaperId_fkey` FOREIGN KEY (`newspaperId`) REFERENCES `newspapers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `years` ADD CONSTRAINT `years_decadeId_fkey` FOREIGN KEY (`decadeId`) REFERENCES `decades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `months` ADD CONSTRAINT `months_yearId_fkey` FOREIGN KEY (`yearId`) REFERENCES `years`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `editions` ADD CONSTRAINT `editions_monthId_fkey` FOREIGN KEY (`monthId`) REFERENCES `months`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
