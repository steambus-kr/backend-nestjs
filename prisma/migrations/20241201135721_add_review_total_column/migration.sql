-- AlterTable
ALTER TABLE `Game` ADD COLUMN `review_total` INTEGER NULL;

-- Update
UPDATE Game SET `review_total` = `review_positive` + `review_negative`;

-- AlterTable
ALTER TABLE `Game` MODIFY COLUMN `review_total` INTEGER NOT NULL;
