/*
  Warnings:

  - Added the required column `updatedAt` to the `GbpPhoto` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `GbpPost` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GbpPhoto" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "GbpPost" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
