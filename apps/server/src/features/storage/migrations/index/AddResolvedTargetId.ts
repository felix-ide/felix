import { MigrationInterface, QueryRunner } from "typeorm";

export class AddResolvedTargetId1234567890123 implements MigrationInterface {
    name = 'AddResolvedTargetId1234567890123';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add resolved_target_id column
        await queryRunner.query(`
            ALTER TABLE "relationships"
            ADD COLUMN "resolved_target_id" text
        `);

        // Add index for resolved_target_id
        await queryRunner.query(`
            CREATE INDEX "idx_relationships_resolved_target"
            ON "relationships" ("resolved_target_id")
        `);

        // Add foreign key constraint for resolved_target_id
        // This references the components table
        await queryRunner.query(`
            ALTER TABLE "relationships"
            ADD CONSTRAINT "FK_relationships_resolved_target"
            FOREIGN KEY ("resolved_target_id")
            REFERENCES "components" ("id")
            ON DELETE CASCADE
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove foreign key constraint
        await queryRunner.query(`
            ALTER TABLE "relationships"
            DROP CONSTRAINT "FK_relationships_resolved_target"
        `);

        // Remove index
        await queryRunner.query(`
            DROP INDEX "idx_relationships_resolved_target"
        `);

        // Remove column
        await queryRunner.query(`
            ALTER TABLE "relationships"
            DROP COLUMN "resolved_target_id"
        `);
    }
}