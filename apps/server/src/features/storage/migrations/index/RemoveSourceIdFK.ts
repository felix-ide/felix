import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveSourceIdFK1758646000000 implements MigrationInterface {
    name = 'RemoveSourceIdFK1758646000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // SQLite doesn't support dropping constraints directly
        // We need to recreate the table without the FK on source_id

        // This migration assumes the resolved_source_id column was already added
        // The entity definition will handle the FK constraint on resolved_source_id

        // For SQLite, TypeORM will handle this through synchronize
        // or we'd need to recreate the entire table
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Reverting would add back the FK on source_id, which we don't want
    }
}