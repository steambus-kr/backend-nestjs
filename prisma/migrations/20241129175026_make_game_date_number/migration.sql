/*
  Warnings:

  - You are about to alter the column `release_date` on the `Game` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.

*/

-- AlterTable
ALTER TABLE `Game` MODIFY `release_date` VarChar(191) NULL;

-- Update
UPDATE `Game` SET `release_date`=NULL;

-- AlterTable
ALTER TABLE `Game` MODIFY `release_date` DATETIME(3) NULL;
