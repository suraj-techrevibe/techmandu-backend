import {MigrationInterface, QueryRunner} from "typeorm";

export class DevFeatures1751366790360 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "faq" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "id" uuid NOT NULL DEFAULT uuid_generate_v4(), "question" character varying NOT NULL, "answer" text NOT NULL, "category" character varying, "isPublished" boolean NOT NULL DEFAULT true, "channelId" integer, CONSTRAINT "UQ_1956813f611e3bf038f6b61a61f" UNIQUE ("question"), CONSTRAINT "PK_d6f5a52b1a96dd8d0591f9fbc47" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "product_review" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "summary" character varying NOT NULL, "body" text NOT NULL, "rating" integer NOT NULL, "authorName" character varying NOT NULL, "authorLocation" character varying, "upvotes" integer NOT NULL DEFAULT '0', "downvotes" integer NOT NULL DEFAULT '0', "state" character varying NOT NULL, "response" text, "responseCreatedAt" TIMESTAMP, "id" SERIAL NOT NULL, "productId" integer, "productVariantId" integer, "authorId" integer, CONSTRAINT "PK_6c00bd3bbee662e1f7a97dbce9a" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE TABLE "product_custom_fields_roles_role" ("productId" integer NOT NULL, "roleId" integer NOT NULL, CONSTRAINT "PK_e9ab5f131e935348906be4a0fb1" PRIMARY KEY ("productId", "roleId"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_e09b7e53610c0abcfd31865243" ON "product_custom_fields_roles_role" ("productId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_a0062512b347fc28ce96aeb091" ON "product_custom_fields_roles_role" ("roleId") `, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsFeaturedreviewid" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsCollections" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsReviewrating" double precision`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsReviewcount" double precision DEFAULT '0'`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsProductsubtitle" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsProductfeatures" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsProducttags" text`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsProductadvanceprice" jsonb`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsAdminaccountlimitsilver" integer DEFAULT '5'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsAdminaccountlimitgold" integer DEFAULT '15'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsAdminaccountlimitdiamond" integer DEFAULT '30'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsProductlimitsilver" integer DEFAULT '1000'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsProductlimitgold" integer DEFAULT '2500'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsProductlimitdiamond" integer DEFAULT '7500'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsOrderlimitannualsilver" integer DEFAULT '10000'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsOrderlimitannualgold" integer DEFAULT '25000'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsOrderlimitannualdiamond" integer DEFAULT '50000'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsStaticpagelimitsilver" integer DEFAULT '3'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsStaticpagelimitgold" integer DEFAULT '10'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsStaticpagelimitdiamond" integer DEFAULT '25'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsHerobannerlimitsilver" integer DEFAULT '3'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsHerobannerlimitgold" integer DEFAULT '5'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsHerobannerlimitdiamond" integer DEFAULT '10'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsFaqlimitsilver" integer DEFAULT '5'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsFaqlimitgold" integer DEFAULT '10'`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" ADD "customFieldsFaqlimitdiamond" integer DEFAULT '20'`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD CONSTRAINT "FK_49d195dd5e613abc1e210127a2e" FOREIGN KEY ("customFieldsFeaturedreviewid") REFERENCES "product_review"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "faq" ADD CONSTRAINT "FK_2526e0b32f1c4c7166a79cbddbd" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "product_review" ADD CONSTRAINT "FK_06e7335708b5e7870f1eaa608d2" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "product_review" ADD CONSTRAINT "FK_de987f9289b240e8702c9b8148e" FOREIGN KEY ("productVariantId") REFERENCES "product_variant"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "product_review" ADD CONSTRAINT "FK_15a352d289533a11d67715d353a" FOREIGN KEY ("authorId") REFERENCES "customer"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`, undefined);
        await queryRunner.query(`ALTER TABLE "product_custom_fields_roles_role" ADD CONSTRAINT "FK_e09b7e53610c0abcfd31865243f" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE CASCADE`, undefined);
        await queryRunner.query(`ALTER TABLE "product_custom_fields_roles_role" ADD CONSTRAINT "FK_a0062512b347fc28ce96aeb0915" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE CASCADE`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "product_custom_fields_roles_role" DROP CONSTRAINT "FK_a0062512b347fc28ce96aeb0915"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_custom_fields_roles_role" DROP CONSTRAINT "FK_e09b7e53610c0abcfd31865243f"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_review" DROP CONSTRAINT "FK_15a352d289533a11d67715d353a"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_review" DROP CONSTRAINT "FK_de987f9289b240e8702c9b8148e"`, undefined);
        await queryRunner.query(`ALTER TABLE "product_review" DROP CONSTRAINT "FK_06e7335708b5e7870f1eaa608d2"`, undefined);
        await queryRunner.query(`ALTER TABLE "faq" DROP CONSTRAINT "FK_2526e0b32f1c4c7166a79cbddbd"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "FK_49d195dd5e613abc1e210127a2e"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsFaqlimitdiamond"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsFaqlimitgold"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsFaqlimitsilver"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsHerobannerlimitdiamond"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsHerobannerlimitgold"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsHerobannerlimitsilver"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsStaticpagelimitdiamond"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsStaticpagelimitgold"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsStaticpagelimitsilver"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsOrderlimitannualdiamond"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsOrderlimitannualgold"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsOrderlimitannualsilver"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsProductlimitdiamond"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsProductlimitgold"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsProductlimitsilver"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsAdminaccountlimitdiamond"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsAdminaccountlimitgold"`, undefined);
        await queryRunner.query(`ALTER TABLE "global_settings" DROP COLUMN "customFieldsAdminaccountlimitsilver"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsProductadvanceprice"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsProducttags"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsProductfeatures"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsProductsubtitle"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsReviewcount"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsReviewrating"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsCollections"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsFeaturedreviewid"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_a0062512b347fc28ce96aeb091"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_e09b7e53610c0abcfd31865243"`, undefined);
        await queryRunner.query(`DROP TABLE "product_custom_fields_roles_role"`, undefined);
        await queryRunner.query(`DROP TABLE "product_review"`, undefined);
        await queryRunner.query(`DROP TABLE "faq"`, undefined);
   }

}
