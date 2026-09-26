-- Banner management: the old "placement" (lateral/rodapé) goes away — every
-- banner now runs in the strip above the footer on all pages — and banners
-- gain pinning, a run window, an appearance cap and lifetime counters, plus a
-- per-day stats table. SiteSetting.bannerSlots = banners per page view.

-- AlterTable
ALTER TABLE `site_settings` ADD COLUMN `bannerSlots` INTEGER NOT NULL DEFAULT 8;

-- AlterTable
ALTER TABLE `sponsors` DROP COLUMN `placement`,
    ADD COLUMN `appearances` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `clicks` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `endsAt` DATETIME(3) NULL,
    ADD COLUMN `maxAppearances` INTEGER NULL,
    ADD COLUMN `pinned` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `startsAt` DATETIME(3) NULL,
    ADD COLUMN `views` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `sponsor_daily_stats` (
    `sponsorId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `appearances` INTEGER NOT NULL DEFAULT 0,
    `views` INTEGER NOT NULL DEFAULT 0,
    `clicks` INTEGER NOT NULL DEFAULT 0,

    INDEX `sponsor_daily_stats_date_idx`(`date`),
    PRIMARY KEY (`sponsorId`, `date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sponsor_daily_stats` ADD CONSTRAINT `sponsor_daily_stats_sponsorId_fkey` FOREIGN KEY (`sponsorId`) REFERENCES `sponsors`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;