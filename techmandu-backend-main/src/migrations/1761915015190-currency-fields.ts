import {MigrationInterface, QueryRunner} from "typeorm";

export class CurrencyFields1761915015190 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsNprequivalenttousd" double precision DEFAULT '0'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsNprequvalenttoaud" double precision DEFAULT '0'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsNprequvalenttoaud"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsNprequivalenttousd"`, undefined);
   }

}
