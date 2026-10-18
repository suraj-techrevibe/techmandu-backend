import {MigrationInterface, QueryRunner} from "typeorm";

export class RemovedDuplicateCf1762769709719 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsAdditionalinformation"`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsAdditionalinformation" text`, undefined);
   }

}
