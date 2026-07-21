-- AlterTable
ALTER TABLE `admin_users` ADD COLUMN `mfaBackupCodes` TEXT NULL,
    ADD COLUMN `mfaEnabled` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `mfaSecret` VARCHAR(191) NULL;
