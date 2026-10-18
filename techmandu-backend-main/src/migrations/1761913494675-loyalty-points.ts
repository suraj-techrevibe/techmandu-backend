import {MigrationInterface, QueryRunner} from "typeorm";

export class LoyaltyPoints1761913494675 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "customer" ADD "customFieldsLoyaltypoints" integer DEFAULT '0'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "customer" DROP COLUMN "customFieldsLoyaltypoints"`, undefined);
   }

}
