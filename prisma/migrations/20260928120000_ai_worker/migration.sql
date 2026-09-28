-- AlterTable
ALTER TABLE `site_settings` ADD COLUMN `aiWorkerEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `aiWorkerIntervalSec` INTEGER NOT NULL DEFAULT 20;

