import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResolvedSourceId1758645000000 implements MigrationInterface {
    name = 'AddResolvedSourceId1758645000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add resolved_source_id column
        await queryRunner.query(`
            ALTER TABLE "relationships"
            ADD COLUMN "resolved_source_id" text
        `);

        // Add index for resolved_source_id
        await queryRunner.query(`
            CREATE INDEX "idx_relationships_resolved_source"
            ON "relationships" ("resolved_source_id")
        `);

        // Note: We're NOT adding a foreign key constraint here because SQLite with TypeORM
        // will handle it through the entity definition
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove index
        await queryRunner.query(`
            DROP INDEX "idx_relationships_resolved_source"
        `);

        // Remove column
        await queryRunner.query(`
            ALTER TABLE "relationships"
            DROP COLUMN "resolved_source_id"
        `);
    }
}