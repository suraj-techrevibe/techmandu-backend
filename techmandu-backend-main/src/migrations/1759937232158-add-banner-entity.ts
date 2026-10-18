import {MigrationInterface, QueryRunner} from "typeorm";

export class AddBannerEntity1759937232158 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "banner" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "description" character varying NOT NULL, "ctaText" character varying NOT NULL, "ctaLink" character varying NOT NULL, "id" SERIAL NOT NULL, "imageId" integer, CONSTRAINT "PK_6d9e2570b3d85ba37b681cd4256" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`ALTER TABLE "banner" ADD CONSTRAINT "FK_6a6cc2453a0675d3e2cad3070c0" FOREIGN KEY ("imageId") REFERENCES "asset"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "banner" DROP CONSTRAINT "FK_6a6cc2453a0675d3e2cad3070c0"`, undefined);
        await queryRunner.query(`DROP TABLE "banner"`, undefined);
   }

}
