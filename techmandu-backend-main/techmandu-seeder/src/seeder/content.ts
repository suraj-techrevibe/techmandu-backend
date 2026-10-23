import path from "path";
import { LanguageCode } from "@vendure/common/lib/generated-types";
import { ChannelService, CollectionService, TransactionalConnection } from "@vendure/core";
import { initialData } from "../initial";
import { Banner } from "../plugins/product-enhancements/entities/banner.entity";
import { Blog } from "../plugins/blogs/entities/blog-entity";
import { PageService } from "../plugins/pages/services/page.service";
import { PageGroupService } from "../plugins/pages/services/page-group.service";
import { PageTranslation } from "../plugins/pages/entities/page-translation.entity";
import { PageGroupTranslation } from "../plugins/pages/entities/page-group-translation.entity";
import { generateDemoQr, ImageProvider, keywordFor, mapLimit } from "./images";
import { log, PreparedAssets, SeedContext } from "./context";
import { assetUrl, createAssetFromFile } from "./store";
import { BANNERS, BLOGS, HERO_SLIDES, PAGE_GROUPS, PAGES } from "./data";

/**
 * Runs BEFORE Vendure boots: creates every image file the later steps need
 * (hero slides, banners, collection pictures, demo payment QR).
 */
export async function prepareContentImages(images: ImageProvider): Promise<Omit<PreparedAssets, "csvPath">> {
  const qrPath = path.join(images.dir, "demo-payment-qr.png");
  generateDemoQr(qrPath);

  const hero = await images.getMany("hero", HERO_SLIDES.length, { width: 1600, height: 600, keyword: "technology", label: "Techmandu" });
  const banners = await images.getMany("banner", BANNERS.length, { width: 1200, height: 400, keyword: "gadgets", label: "Techmandu" });

  const names = (initialData.collections ?? []).map((c) => c.name);
  const files = await mapLimit(names, 6, (name) =>
    images.get({
      name: `collection-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      width: 600,
      height: 600,
      keyword: keywordFor(name),
      label: name,
    }),
  );
  const collections: Record<string, string> = {};
  names.forEach((n, i) => (collections[n] = files[i]));

  return { qrPath, hero, banners, collections };
}

export async function seedContent(sc: SeedContext) {
  const { ctx, prepared } = sc;
  const connection = sc.get(TransactionalConnection);
  const channelService = sc.get(ChannelService);
  const imagePath = (file: string) => path.join(sc.images.dir, file);
  const channel = await channelService.getDefaultChannel(ctx);

  // ---- Hero slides (Channel.heroSection) ---------------------------------------------------------
  const current = (await channelService.findAll(ctx, { take: 500 })).items.find((c) => c.id === channel.id);
  if (((current?.customFields as any)?.heroSection ?? []).length) {
    log.info("Hero section already set – skipped");
  } else {
    const heroSection = [];
    for (const [i, slide] of HERO_SLIDES.entries()) {
      const asset = await createAssetFromFile(sc, imagePath(prepared.hero[i]));
      heroSection.push({ ...slide, imageUrl: assetUrl(asset) });
    }
    await channelService.update(ctx, { id: channel.id, customFields: sc.fields("Channel", { heroSection }) } as any);
    log.ok(`Hero section: ${heroSection.length} slides`);
  }

  // ---- Banners -----------------------------------------------------------------------------------
  const bannerRepo = connection.getRepository(ctx, Banner);
  let banners = 0;
  for (const [i, banner] of BANNERS.entries()) {
    if (await bannerRepo.findOne({ where: { title: banner.title } })) continue;
    const asset = await createAssetFromFile(sc, imagePath(prepared.banners[i]));
    await bannerRepo.save(new Banner({ ...banner, image: asset }));
    banners++;
  }
  log.ok(`Banners: ${banners} created`);

  // ---- CMS pages (grouped) -----------------------------------------------------------------------
  const groupService = sc.get(PageGroupService);
  const pageService = sc.get(PageService);
  const groupIds: Record<string, any> = {};
  for (const group of PAGE_GROUPS) {
    const existing = await connection
      .getRepository(ctx, PageGroupTranslation)
      .findOne({ where: { slug: group.slug }, relations: ["base"] });
    if (existing) {
      groupIds[group.slug] = existing.base.id;
      continue;
    }
    const created = await groupService.create(ctx, {
      enabled: true,
      translations: [{ languageCode: LanguageCode.en, name: group.name, slug: group.slug }],
    } as any);
    groupIds[group.slug] = created.id;
  }
  let pages = 0;
  for (const page of PAGES) {
    if (await connection.getRepository(ctx, PageTranslation).findOne({ where: { slug: page.slug } })) continue;
    await pageService.create(ctx, {
      enabled: true,
      group: groupIds[page.group],
      translations: [
        {
          languageCode: LanguageCode.en,
          title: page.title,
          slug: page.slug,
          content: page.content,
          metaTitle: page.title,
          metaDescription: page.metaDescription,
          metaKeywords: "techmandu, nepal, gadgets",
        },
      ],
    } as any);
    pages++;
  }
  log.ok(`CMS pages: ${pages} created in ${PAGE_GROUPS.length} groups`);

  // ---- Blogs -------------------------------------------------------------------------------------
  const blogRepo = connection.getRepository(ctx, Blog);
  let blogs = 0;
  for (const blog of BLOGS) {
    if (await blogRepo.findOne({ where: { slug: blog.slug } })) continue;
    await blogRepo.save(
      new Blog({
        name: blog.name,
        slug: blog.slug,
        content: blog.content,
        metaTitle: blog.name,
        metaDescription: blog.metaDescription,
        metaTags: "gadgets, nepal, buying guide",
        channels: [channel],
      }),
    );
    blogs++;
  }
  log.ok(`Blog posts: ${blogs} created`);

  // ---- Collection pictures + navbar flags --------------------------------------------------------
  const collectionService = sc.get(CollectionService);
  const collections = await collectionService.findAll(ctx, { take: 500 });
  const rootId = collections.items.find((c) => c.isRoot)?.id;
  let withImage = 0;
  for (const collection of collections.items) {
    const file = prepared.collections[collection.name];
    if (!file || collection.featuredAsset) continue;
    const asset = await createAssetFromFile(sc, imagePath(file));
    await collectionService.update(ctx, {
      id: collection.id,
      assetIds: [asset.id],
      featuredAssetId: asset.id,
      customFields: sc.fields("Collection", { showInNavBar: !collection.parentId || collection.parentId === rootId }),
    } as any);
    withImage++;
  }
  log.ok(`Collections: ${withImage} got a featured image`);
}

export async function seedOrders(_sc: SeedContext) {
  log.warn("Demo orders are not implemented yet");
}
