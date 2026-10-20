-- CreateTable
CREATE TABLE `AllowedUser` (
    `id` VARCHAR(20) NOT NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `badgeLimit` INTEGER NOT NULL DEFAULT 5,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Badge` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(20) NOT NULL,
    `tooltip` VARCHAR(255) NOT NULL,
    `badge` VARCHAR(512) NOT NULL,
    `position` INTEGER NOT NULL,

    INDEX `Badge_userId_position_idx`(`userId`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BadgeRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` VARCHAR(20) NOT NULL,
    `badgeId` INTEGER NULL,
    `tooltip` VARCHAR(255) NOT NULL,
    `image` VARCHAR(512) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `reviewedAt` DATETIME(3) NULL,

    INDEX `BadgeRequest_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `BadgeRequest_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `BadgeRequest` ADD CONSTRAINT `BadgeRequest_badgeId_fkey` FOREIGN KEY (`badgeId`) REFERENCES `Badge`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
