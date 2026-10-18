import {MigrationInterface, QueryRunner} from "typeorm";

export class AddProductCustomFields1759936304613 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsAdditionalinformation" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsYoutubevideolink" character varying(255)`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsYoutubevideolink"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsAdditionalinformation"`, undefined);
   }

}
