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

-- ============================================================
-- PARTE 2 — rodar depois, só se as 3 migrações acima já tiverem
-- sido aplicadas em produção anteriormente (não roda a parte 1 de novo).
-- ============================================================

-- ============================================================
-- Migration: 20260720170000_add_user_email_reset_tokens
-- ============================================================
ALTER TABLE `admin_users` ADD COLUMN `name` VARCHAR(191) NULL;
ALTER TABLE `admin_users` ADD COLUMN `email` VARCHAR(191) NULL;

UPDATE `admin_users` SET `name` = `username`, `email` = CONCAT(`username`, '@localhost') WHERE `email` IS NULL;

ALTER TABLE `admin_users` MODIFY COLUMN `name` VARCHAR(191) NOT NULL;
ALTER TABLE `admin_users` MODIFY COLUMN `email` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `admin_users_email_key` ON `admin_users`(`email`);

CREATE TABLE `password_reset_tokens` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tokenHash` VARCHAR(191) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `password_reset_tokens_tokenHash_key`(`tokenHash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20260720202147_add_sponsors_and_analytics
-- ============================================================
CREATE TABLE `sponsors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NOT NULL,
    `linkUrl` VARCHAR(191) NULL,
    `placement` ENUM('SIDEBAR', 'FOOTER', 'BOTH') NOT NULL DEFAULT 'BOTH',
    `order` INTEGER NOT NULL DEFAULT 0,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `analytics_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('EDITION_VIEW', 'EDITION_DOWNLOAD', 'SITE_VISIT') NOT NULL,
    `editionId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `analytics_events_type_createdAt_idx`(`type`, `createdAt`),
    INDEX `analytics_events_editionId_idx`(`editionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `analytics_events` ADD CONSTRAINT `analytics_events_editionId_fkey` FOREIGN KEY (`editionId`) REFERENCES `editions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Registra as 2 migrações novas como já aplicadas
-- ============================================================
INSERT INTO `_prisma_migrations`
  (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`)
VALUES
  (UUID(), '05f2614d62f43ac6727a9fa2b6e4f38a7294e3bce4a241a013f33b4d428c4036', NOW(3), '20260720170000_add_user_email_reset_tokens', NULL, NULL, NOW(3), 1),
  (UUID(), '2f7205879c613ab8eef7b7f4dbed3af9b4a8ee615d16ed672ca250d3353ebd32', NOW(3), '20260720202147_add_sponsors_and_analytics', NULL, NULL, NOW(3), 1);

-- ============================================================
-- PARTE 3 — rodar depois, só se as migrações da Parte 1 e Parte 2
-- já tiverem sido aplicadas em produção anteriormente.
-- ============================================================

-- ============================================================
-- Migration: 20260721115742_add_accent_color
-- ============================================================
ALTER TABLE `site_settings` ADD COLUMN `accentColor` VARCHAR(191) NOT NULL DEFAULT '#d9822b';

-- ============================================================
-- Migration: 20260721120645_add_pages
-- ============================================================
CREATE TABLE `pages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `coverImageUrl` VARCHAR(191) NULL,
    `published` BOOLEAN NOT NULL DEFAULT false,
    `showInMenu` BOOLEAN NOT NULL DEFAULT true,
    `menuLabel` VARCHAR(191) NULL,
    `menuOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `pages_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `page_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `pageId` INTEGER NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `page_images` ADD CONSTRAINT `page_images_pageId_fkey` FOREIGN KEY (`pageId`) REFERENCES `pages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- Migration: 20260721124737_add_social_links
-- ============================================================
ALTER TABLE `site_settings` ADD COLUMN `facebookUrl` VARCHAR(191) NULL,
    ADD COLUMN `instagramUrl` VARCHAR(191) NULL,
    ADD COLUMN `xUrl` VARCHAR(191) NULL;

-- ============================================================
-- Migration: 20260721132205_add_secondary_support_colors
-- ============================================================
ALTER TABLE `site_settings` ADD COLUMN `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#A8E6CF',
    ADD COLUMN `supportColor` VARCHAR(191) NOT NULL DEFAULT '#AEDDF7';

-- ============================================================
-- Migration: 20260721141830_add_tagline_background_color
-- ============================================================
ALTER TABLE `newspapers` ADD COLUMN `tagline` VARCHAR(191) NULL;
ALTER TABLE `site_settings` ADD COLUMN `backgroundColor` VARCHAR(191) NOT NULL DEFAULT '#f7f8fb';

-- ============================================================
-- Registra as 5 migrações novas como já aplicadas
-- ============================================================
INSERT INTO `_prisma_migrations`
  (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`)
VALUES
  (UUID(), 'b5a87be09c8fed76ca6d3a8cc85ce2e43f0a35618a5e8d99c02285c1292c5757', NOW(3), '20260721115742_add_accent_color', NULL, NULL, NOW(3), 1),
  (UUID(), '786041768143efdd1d94e90d18e4bccfe39dc91cbb2bc911a578c59834e77d68', NOW(3), '20260721120645_add_pages', NULL, NULL, NOW(3), 1),
  (UUID(), '379c76729a0cbeb9a5c77176a11e022eec0c3a18eb82de79537b2377c9412939', NOW(3), '20260721124737_add_social_links', NULL, NULL, NOW(3), 1),
  (UUID(), 'dde99e467ec23ac9b6f289b6c7afe769f2ed48a2c43d2dc220486fceb280f5c9', NOW(3), '20260721132205_add_secondary_support_colors', NULL, NULL, NOW(3), 1),
  (UUID(), 'f4e1652d88e08270ba6d1be7430f4e3d266161ffca1b2237e3d6826c528daca8', NOW(3), '20260721141830_add_tagline_background_color', NULL, NULL, NOW(3), 1);

-- ============================================================
-- PARTE 4 — rodar depois, só se as Partes 1, 2 e 3 já tiverem sido
-- aplicadas em produção anteriormente.
-- ============================================================

-- ============================================================
-- Migration: 20260721205708_add_mfa_fields
-- ============================================================
ALTER TABLE `admin_users` ADD COLUMN `mfaBackupCodes` TEXT NULL,
    ADD COLUMN `mfaEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `mfaSecret` VARCHAR(191) NULL;

-- ============================================================
-- Registra a migração nova como já aplicada
-- ============================================================
INSERT INTO `_prisma_migrations`
  (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`)
VALUES
  (UUID(), '2be5d1c32384f00dfe3e96f83b51f439848fb17afd450e6321908164e7bfff2c', NOW(3), '20260721205708_add_mfa_fields', NULL, NULL, NOW(3), 1);
