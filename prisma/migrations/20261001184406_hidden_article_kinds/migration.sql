-- CreateTable
CREATE TABLE `hidden_article_kinds` (
    `kind` VARCHAR(20) NOT NULL,
    `hiddenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`kind`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
