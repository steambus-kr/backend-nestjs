-- AlterTable
ALTER TABLE `OutdatedGame` ADD COLUMN `added_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
