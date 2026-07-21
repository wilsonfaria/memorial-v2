-- AlterTable
ALTER TABLE `newspapers` ADD COLUMN `tagline` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `site_settings` ADD COLUMN `backgroundColor` VARCHAR(191) NOT NULL DEFAULT '#f7f8fb';
