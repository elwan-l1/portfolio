-- AlterTable
ALTER TABLE `blog_posts`
    DROP COLUMN `locale`,
    ADD COLUMN `body` MEDIUMTEXT NULL,
    ADD COLUMN `art` TEXT NULL,
    ADD COLUMN `views` INTEGER NOT NULL DEFAULT 0;

UPDATE `blog_posts` SET `body` = `excerpt`;

ALTER TABLE `blog_posts` MODIFY `body` MEDIUMTEXT NOT NULL;

-- CreateIndex
CREATE INDEX `blog_posts_views_idx` ON `blog_posts`(`views`);

-- CreateTable
CREATE TABLE `blog_post_sources` (
    `post_id` INTEGER NOT NULL,
    `source` VARCHAR(32) NOT NULL,
    `views` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`post_id`, `source`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `blog_post_sources` ADD CONSTRAINT `blog_post_sources_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `blog_post_tags` (
    `post_id` INTEGER NOT NULL,
    `tag` VARCHAR(32) NOT NULL,

    INDEX `blog_post_tags_tag_idx`(`tag`),
    PRIMARY KEY (`post_id`, `tag`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `blog_post_tags` ADD CONSTRAINT `blog_post_tags_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `blog_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
