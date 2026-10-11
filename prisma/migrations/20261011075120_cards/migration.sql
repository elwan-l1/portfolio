-- CreateTable
CREATE TABLE `cards` (
    `id` CHAR(36) NOT NULL,
    `title` VARCHAR(40) NOT NULL,
    `glyph` VARCHAR(4) NOT NULL,
    `color` VARCHAR(16) NOT NULL,
    `layout` ENUM('grid', 'list', 'chips', 'art') NOT NULL,
    `size` ENUM('s', 'l', 'xl') NOT NULL DEFAULT 'l',
    `items` TEXT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
