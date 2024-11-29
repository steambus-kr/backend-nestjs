/*
  Warnings:

  - The primary key for the `Genre` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `B` on the `_GameToGenre` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - Added the required column `genre_id` to the `Genre` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_GameToGenre` DROP FOREIGN KEY `_GameToGenre_B_fkey`;

-- AlterTable
ALTER TABLE `Genre` DROP PRIMARY KEY,
    ADD COLUMN `genre_id` INTEGER NOT NULL,
    ADD PRIMARY KEY (`genre_id`);

-- AlterTable
ALTER TABLE `_GameToGenre` MODIFY `B` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `_GameToGenre` ADD CONSTRAINT `_GameToGenre_B_fkey` FOREIGN KEY (`B`) REFERENCES `Genre`(`genre_id`) ON DELETE CASCADE ON UPDATE CASCADE;
