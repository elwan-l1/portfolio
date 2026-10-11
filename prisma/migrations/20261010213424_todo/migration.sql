-- CreateTable
CREATE TABLE `todo_projects` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `description` VARCHAR(300) NOT NULL DEFAULT '',
    `color` VARCHAR(16) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `todos` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `project_id` INTEGER NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('todo', 'in_progress', 'in_review', 'done', 'cancelled') NOT NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `todos_project_id_status_idx`(`project_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `todo_tags` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(24) NOT NULL,
    `color` VARCHAR(16) NOT NULL,
    `icon` VARCHAR(4) NOT NULL,

    UNIQUE INDEX `todo_tags_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `todo_hidden_statuses` (
    `status` ENUM('todo', 'in_progress', 'in_review', 'done', 'cancelled') NOT NULL,

    PRIMARY KEY (`status`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_todo_tag_links` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_todo_tag_links_AB_unique`(`A`, `B`),
    INDEX `_todo_tag_links_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `todos` ADD CONSTRAINT `todos_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `todo_projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_todo_tag_links` ADD CONSTRAINT `_todo_tag_links_A_fkey` FOREIGN KEY (`A`) REFERENCES `todos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_todo_tag_links` ADD CONSTRAINT `_todo_tag_links_B_fkey` FOREIGN KEY (`B`) REFERENCES `todo_tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
