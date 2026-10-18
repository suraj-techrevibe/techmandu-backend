import {MigrationInterface, QueryRunner} from "typeorm";

export class DiscountPlugin1760358524666 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant_price" ADD "customFieldsDiscountprice" integer DEFAULT '0'`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant_price" ADD "customFieldsDiscountpercentage" integer DEFAULT '0'`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_variant_price" DROP COLUMN "customFieldsDiscountpercentage"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_variant_price" DROP COLUMN "customFieldsDiscountprice"`, undefined);
   }

}
