-- AlterTable
ALTER TABLE `interest_translations` DROP PRIMARY KEY,
    MODIFY `locale` ENUM('en', 'fr') NOT NULL,
    ADD PRIMARY KEY (`interest_id`, `locale`);

-- AlterTable
ALTER TABLE `project_translations` DROP PRIMARY KEY,
    MODIFY `locale` ENUM('en', 'fr') NOT NULL,
    ADD PRIMARY KEY (`project_id`, `locale`);
