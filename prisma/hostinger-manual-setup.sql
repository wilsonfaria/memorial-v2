-- Cole este SQL inteiro no phpMyAdmin (aba "SQL") do banco u331354050_memorial.
-- Cria as tabelas do projeto e registra as migrações como já aplicadas, para
-- que `npx prisma migrate deploy` no futuro não tente reaplicá-las.

-- Tabela de controle de migrações do Prisma
CREATE TABLE `_prisma_migrations` (
    `id` VARCHAR(36) NOT NULL,
    `checksum` VARCHAR(64) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `migration_name` VARCHAR(255) NOT NULL,
    `logs` TEXT NULL,
    `rolled_back_at` DATETIME(3) NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `applied_steps_count` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb3;

-- ============================================================
-- Migration: 20260720140127_init
-- ============================================================
CREATE TABLE `newspapers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `newspapers_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `decades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `startYear` INTEGER NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `newspaperId` INTEGER NOT NULL,

    UNIQUE INDEX `decades_newspaperId_startYear_key`(`newspaperId`, `startYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `years` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `year` INTEGER NOT NULL,
    `decadeId` INTEGER NOT NULL,

    UNIQUE INDEX `years_decadeId_year_key`(`decadeId`, `year`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `months` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `month` INTEGER NOT NULL,
    `yearId` INTEGER NOT NULL,

    UNIQUE INDEX `months_yearId_month_key`(`yearId`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

ALTER TABLE `decades` ADD CONSTRAINT `decades_newspaperId_fkey` FOREIGN KEY (`newspaperId`) REFERENCES `newspapers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `years` ADD CONSTRAINT `years_decadeId_fkey` FOREIGN KEY (`decadeId`) REFERENCES `decades`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `months` ADD CONSTRAINT `months_yearId_fkey` FOREIGN KEY (`yearId`) REFERENCES `years`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `editions` ADD CONSTRAINT `editions_monthId_fkey` FOREIGN KEY (`monthId`) REFERENCES `months`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20260720142701_add_admin_user
-- ============================================================
CREATE TABLE `admin_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- Migration: 20260720145552_add_site_settings
-- ============================================================
CREATE TABLE `site_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#4f8ecb',
    `creditsText` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================
-- Registra as 3 migrações como já aplicadas
-- ============================================================
INSERT INTO `_prisma_migrations`
  (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`)
VALUES
  (UUID(), '39540afd142a5f83527102c4ad009de059a6a67aa494ddcf9cfc07dea564d726', NOW(3), '20260720140127_init', NULL, NULL, NOW(3), 1),
  (UUID(), 'bbf187bcc762e67cb877d4b854e2a40cd28adc070bcb28fe759214985661aebc', NOW(3), '20260720142701_add_admin_user', NULL, NULL, NOW(3), 1),
  (UUID(), 'd47af22f5796ac1563982567075f95214a3181993160cd8bc6724883571a77eb', NOW(3), '20260720145552_add_site_settings', NULL, NULL, NOW(3), 1);
