-- Add name/email to admin_users with a temporary backfill, then enforce NOT NULL + unique.
ALTER TABLE `admin_users` ADD COLUMN `name` VARCHAR(191) NULL;
ALTER TABLE `admin_users` ADD COLUMN `email` VARCHAR(191) NULL;

UPDATE `admin_users` SET `name` = `username`, `email` = CONCAT(`username`, '@localhost') WHERE `email` IS NULL;

ALTER TABLE `admin_users` MODIFY COLUMN `name` VARCHAR(191) NOT NULL;
ALTER TABLE `admin_users` MODIFY COLUMN `email` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `admin_users_email_key` ON `admin_users`(`email`);

-- CreateTable
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

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `admin_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
