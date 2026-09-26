-- CreateTable
CREATE TABLE `hero_slides` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `imageUrl` VARCHAR(191) NULL,
    `headline` TEXT NOT NULL,
    `subtext` TEXT NULL,
    `ctaLabel` VARCHAR(191) NULL,
    `ctaHref` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `hero_slides_order_idx`(`order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Carry the existing single hero over as the carousel's first slide, so the
-- homepage looks the same right after deploying.
INSERT INTO `hero_slides` (`imageUrl`, `headline`, `subtext`, `ctaLabel`, `ctaHref`, `order`, `published`, `updatedAt`)
SELECT `heroImageUrl`, `heroHeadline`, `heroSubtext`, `heroCtaLabel`, `heroCtaHref`, 0, true, CURRENT_TIMESTAMP(3)
FROM `homepage_content`
WHERE `id` = 1;
