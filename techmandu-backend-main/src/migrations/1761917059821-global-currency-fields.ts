import {MigrationInterface, QueryRunner} from "typeorm";

export class GlobalCurrencyFields1761917059821 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsLoyaltypointstoamount" double precision DEFAULT '0'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsAmounttoloyaltypoints" integer DEFAULT '100'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsAmounttoloyaltypoints"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsLoyaltypointstoamount"`, undefined);
   }

}
