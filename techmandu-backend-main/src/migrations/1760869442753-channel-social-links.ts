import {MigrationInterface, QueryRunner} from "typeorm";

export class ChannelSocialLinks1760869442753 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsHerosection" jsonb`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" ADD "customFieldsSociallinks" jsonb`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsSociallinks"`, undefined);
        await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "customFieldsHerosection"`, undefined);
   }

}
