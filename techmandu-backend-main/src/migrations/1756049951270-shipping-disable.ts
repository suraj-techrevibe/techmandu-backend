import {MigrationInterface, QueryRunner} from "typeorm";

export class ShippingDisable1756049951270 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "shipping_method" ADD "customFieldsIsdisabled" boolean DEFAULT false`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "shipping_method" DROP COLUMN "customFieldsIsdisabled"`, undefined);
   }

}
