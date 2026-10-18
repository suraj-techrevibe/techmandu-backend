import { Inject, Injectable } from "@nestjs/common";
import {
  CurrencyCode,
  DeletionResponse,
  DeletionResult,
  LanguageCode,
} from "@vendure/common/lib/generated-types";
import { ID, PaginatedList } from "@vendure/common/lib/shared-types";
import {
  ListQueryBuilder,
  ListQueryOptions,
  RelationPaths,
  RequestContext,
  TransactionalConnection,
  assertFound,
  patchEntity,
  Asset,
  PasswordCipher,
  AdministratorService,
  EventBus,
  InternalServerError,
  NativeAuthenticationMethod,
  User,
  RequestContextService,
  ChannelService,
  Channel,
  SellerService,
  isGraphQlErrorResult,
  RoleService,
  ConfigService,
  Administrator,
  StockLocationService,
  ApiType,
} from "@vendure/core";
import {
  SELLER_REGISTRATION_PLUGIN_OPTIONS,
  SellerPermissions,
} from "../constants";
import { SellerRegistration } from "../entities/seller-registration.entity";
import { PluginInitOptions } from "../types";
import { SellerRegistrationVerifiedEvent } from "../events/seller-registration-verified.event";
import { nanoid } from "nanoid";
import { normalizeString } from "@vendure/common/lib/normalize-string";
import { getApiType } from "@vendure/core/dist/api/common/get-api-type";

interface CreateSellerRegistrationInput {
  panNo: string;
  businessName: string;
  businessRegistrationNo: string;
  address: string;
  ownerName: string;
  phone: string;
  email: string;
  isVerified?: boolean;
  panPhoto: { id: ID };
  documents?: { id: ID }[];
}

interface UpdateSellerRegistrationInput {
  id: ID;
  panNo?: string;
  businessName?: string;
  businessRegistrationNo?: string;
  address?: string;
  ownerName?: string;
  phone?: string;
  email?: string;
  panPhoto?: { id: ID };
}

@Injectable()
export class SellerRegistrationService {
  constructor(
    private connection: TransactionalConnection,
    private listQueryBuilder: ListQueryBuilder,
    @Inject(SELLER_REGISTRATION_PLUGIN_OPTIONS)
    private options: PluginInitOptions,
    private ctxService: RequestContextService,
    private passwordCipher: PasswordCipher,
    private eventBus: EventBus,
    private requestContextService: RequestContextService,
    private channelService: ChannelService,
    private sellerService: SellerService,
    private administratorService: AdministratorService,
    private roleService: RoleService,
    private configService: ConfigService,
    private stockLocationService: StockLocationService,
  ) {}

  findAll(
    ctx: RequestContext,
    options?: ListQueryOptions<SellerRegistration>,
    relations?: RelationPaths<SellerRegistration>,
  ): Promise<PaginatedList<SellerRegistration>> {
    const relationsArray =
      relations && Array.isArray(relations) ? relations : [];
    const uniqueRelations = Array.from(
      new Set<string>([...relationsArray, "panPhoto"]),
    );

    return this.listQueryBuilder
      .build(SellerRegistration, options, {
        relations: uniqueRelations,
        ctx,
      })
      .getManyAndCount()
      .then(([items, totalItems]) => {
        return {
          items,
          totalItems,
        };
      });
  }

  verifiedFindAll(
    ctx: RequestContext,
    options?: ListQueryOptions<SellerRegistration>,
    relations?: RelationPaths<SellerRegistration>,
  ): Promise<PaginatedList<SellerRegistration>> {
    const relationsArray =
      relations && Array.isArray(relations) ? relations : [];
    const uniqueRelations = Array.from(
      new Set<string>([...relationsArray, "panPhoto"]),
    );

    const modifiedOptions = {
      ...options,
      filter: {
        ...(options?.filter || {}),
        isVerified: { eq: true },
      },
    };

    return this.listQueryBuilder
      .build(SellerRegistration, modifiedOptions, {
        relations: uniqueRelations,
        ctx,
      })
      .getManyAndCount()
      .then(([items, totalItems]) => {
        return {
          items,
          totalItems,
        };
      });
  }
  findOne(
    ctx: RequestContext,
    id: ID,
    relations?: RelationPaths<SellerRegistration>,
  ): Promise<SellerRegistration | null> {
    const repository = this.connection.getRepository(ctx, SellerRegistration);
    const relationsArray =
      relations && Array.isArray(relations) ? relations : [];
    const uniqueRelations = new Set<string>([...relationsArray, "panPhoto"]);

    return repository.findOne({
      where: { id },
      relations: Array.from(uniqueRelations),
    });
  }

  async legacyCreate(ctx: RequestContext, input: any) {
    try {
      const repo = this.connection.getRepository(ctx, SellerRegistration);

      const normalized: CreateSellerRegistrationInput = {
        ...input,
        panNo: input.panNo?.trim(),
        businessName: input.businessName?.trim(),
        businessRegistrationNo: input.businessRegistrationNo?.trim(),
        address: input.address?.trim(),
        ownerName: input.ownerName?.trim(),
        phone: input.phone?.trim(),
        email: input.email?.trim(),
        isVerified: false,
      };

      if (!normalized.email || !normalized.businessName || !normalized.panNo) {
        return new InternalServerError(
          "Missing required fields: email, businessName, panNo",
        );
      }

      const existingEmail = await repo.findOne({
        where: { email: normalized.email, isVerified: true },
      });
      if (existingEmail) {
        return new InternalServerError(`${normalized.email} already exists`);
      }

      const existingBusiness = await repo.findOne({
        where: { businessName: normalized.businessName, isVerified: true },
      });
      if (existingBusiness) {
        return new InternalServerError(
          `${normalized.businessName} already exists`,
        );
      }
      const entity = repo.create(normalized);
      const saved = await repo.save(entity);
      const created = await this.findOne(ctx, saved.id);
      if (!created) {
        return new InternalServerError(
          "Could not load the created SellerRegistration",
        );
      }
      return created;
    } catch (err: any) {
      return new InternalServerError(
        `Error creating seller registration: ${err?.message ?? String(err)}`,
      );
    }
  }

  async create(
    ctx: RequestContext,
    input: CreateSellerRegistrationInput,
  ): Promise<SellerRegistration> {
    try {
      const repo = this.connection.getRepository(ctx, SellerRegistration);

      const { panPhoto, documents, ...otherInputs } = input;
      const normalizedInputs = {
        panNo: otherInputs.panNo?.trim(),
        businessName: otherInputs.businessName?.trim(),
        businessRegistrationNo: otherInputs.businessRegistrationNo?.trim(),
        address: otherInputs.address?.trim(),
        ownerName: otherInputs.ownerName?.trim(),
        phone: otherInputs.phone?.trim(),
        email: otherInputs.email?.trim(),
        isVerified: false,
      };

      const entity = repo.create(normalizedInputs);

      if (panPhoto && panPhoto.id) {
        entity.panPhoto = { id: panPhoto.id } as Asset;
      }
      if (documents && documents.length > 0) {
        entity.documents = documents.map((d) => ({ id: d.id }) as Asset);
      }

      const saved = await repo.save(entity);
      return await assertFound(
        this.findOne(ctx, saved.id, ["panPhoto", "documents"]),
      );
    } catch (err) {
      throw new Error(
        "Error creating seller registration: " + (err as Error).message,
      );
    }
  }

  async update(
    ctx: RequestContext,
    input: UpdateSellerRegistrationInput,
  ): Promise<SellerRegistration> {
    const { id, panPhoto, ...otherInputs } = input;

    const entity = await this.connection.getEntityOrThrow(
      ctx,
      SellerRegistration,
      id,
    );
    const updatedEntity = patchEntity(entity, otherInputs);
    if (panPhoto && panPhoto.id) {
      updatedEntity.panPhoto = { id: panPhoto.id } as Asset;
    }

    await this.connection
      .getRepository(ctx, SellerRegistration)
      .save(updatedEntity, { reload: false });
    return assertFound(this.findOne(ctx, updatedEntity.id, ["panPhoto"]));
  }

  async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
    const entity = await this.connection.getEntityOrThrow(
      ctx,
      SellerRegistration,
      id,
    );
    try {
      await this.connection
        .getRepository(ctx, SellerRegistration)
        .remove(entity);
      return {
        result: DeletionResult.DELETED,
      };
    } catch (e: any) {
      return {
        result: DeletionResult.NOT_DELETED,
        message: e.toString(),
      };
    }
  }

  async verify(
    ctx: RequestContext,
    id: ID,
    stockLocationId: ID,
  ): Promise<{ message: string; success: boolean }> {
    const entity = await this.connection.getEntityOrThrow(
      ctx,
      SellerRegistration,
      id,
    );
    console.log("Hit: ", stockLocationId);
    if (entity.isVerified) {
      console.log("Already verified entity");
      try {
        const tempPassword = nanoid(8);
        console.log(`Password: ${tempPassword}`);
        const hashedPw = await this.passwordCipher.hash(tempPassword);

        const adminCtx = await this.ctxService.create({
          apiType: "admin",
          languageCode: LanguageCode.en,
        });

        const users = await this.connection.getRepository(adminCtx, User).find({
          where: { identifier: entity.email },
          relations: ["authenticationMethods"],
        });

        let user;
        let found = false;

        for (const userInstance of users) {
          if (found) break;
          const admin = await this.administratorService.findOneByUserId(
            ctx,
            userInstance.id,
          );
          if (admin) {
            user = userInstance;
            found = true;
          }
        }

        if (!user) {
          throw new InternalServerError(
            "Cannot create seller - invalid administrator",
          );
        }

        const nativeAuthMethod = await user.getNativeAuthenticationMethod();
        if (!nativeAuthMethod) {
          throw new InternalServerError(
            "User does not have native authentication method",
          );
        }

        await this.connection
          .getRepository(adminCtx, NativeAuthenticationMethod)
          .update({ id: nativeAuthMethod.id }, { passwordHash: hashedPw });

        const updatedAuth = await this.connection
          .getRepository(adminCtx, NativeAuthenticationMethod)
          .findOne({
            where: { id: nativeAuthMethod.id },
            select: ["passwordHash"],
          });

        const passwordValid = await this.passwordCipher.check(
          tempPassword,
          updatedAuth?.passwordHash || "",
        );

        if (!passwordValid) {
          throw new InternalServerError("Password update verification failed");
        }

        this.eventBus.publish(
          new SellerRegistrationVerifiedEvent(
            adminCtx,
            entity.email,
            entity.businessName,
            entity.email,
            tempPassword,
            `${process.env.SERVER_URL}admin`,
          ),
        );

        return {
          message:
            "Password Changed Successfully - Resending seller creation email",
          success: true,
        };
      } catch (error: any) {
        console.error("Password reset error:", error);
        return {
          message: `Password reset failed: ${error.message}`,
          success: false,
        };
      }
    }

    try {
      entity.isVerified = true;
      await this.connection.getRepository(ctx, SellerRegistration).save(entity);

      const superAdminCtx = await this.getSuperAdminContext(ctx, "shop");
      const existingAdmin = await this.connection
        .getRepository(superAdminCtx, Administrator)
        .findOne({
          where: { emailAddress: entity.email },
        });

      if (existingAdmin) {
        throw new InternalServerError(
          "Cannot create seller - This email address already exists ",
        );
      }

      const channel = await this.createSellerChannelRoleAdmin(
        superAdminCtx,
        entity,
        stockLocationId,
      );

      return {
        message: "Seller verified successfully",
        success: true,
      };
    } catch (e: any) {
      return {
        message: e.toString(),
        success: false,
      };
    }
  }

  private async createSellerChannelRoleAdmin(
    ctx: RequestContext,
    entity: SellerRegistration,
    stockLocationId?: ID,
  ) {
    const defaultChannel = await this.channelService.getDefaultChannel(ctx);
    const shopCode = normalizeString(entity.businessName, "-");
    const seller = await this.sellerService.create(ctx, {
      name: entity.businessName,
    });
    let tempToken: string = "";
    let channelExists = true;

    while (channelExists) {
      tempToken = nanoid(8);
      const channel = await this.connection
        .getRepository(ctx, Channel)
        .findOne({
          where: { token: tempToken },
        });
      channelExists = !!channel;
    }
    const channel = await this.channelService.create(ctx, {
      code: shopCode,
      sellerId: seller.id,
      token: tempToken,
      currencyCode: defaultChannel.defaultCurrencyCode,
      defaultLanguageCode: defaultChannel.defaultLanguageCode,
      defaultCurrencyCode: CurrencyCode.NPR,
      pricesIncludeTax: defaultChannel.pricesIncludeTax,
      defaultShippingZoneId: defaultChannel.defaultShippingZone.id,
      defaultTaxZoneId: defaultChannel.defaultTaxZone.id,
      customFields: {
        vendorBusinessName: entity.businessName,
        vendorName: entity.ownerName,
      },
    });

    if (isGraphQlErrorResult(channel)) {
      throw new InternalServerError(channel.message);
    }

    const tempPassword = nanoid(8);
    const parts = entity.ownerName.trim().split(/\s+/);

    let firstName = "";
    let lastName = "";

    if (parts.length === 1) {
      firstName = parts[0];
    } else if (parts.length === 2) {
      [firstName, lastName] = parts;
    } else if (parts.length > 2) {
      firstName = parts[0];
      lastName = parts[parts.length - 1];
    }
    const administrator = await this.administratorService.create(ctx, {
      firstName,
      lastName,
      emailAddress: entity.email,
      password: tempPassword,
      roleIds: [],
    });

    const trialRole = await this.roleService.create(ctx, {
      code: `Role-${administrator.emailAddress}`,
      description: `Role for ${channel.code}`,
      permissions: [...SellerPermissions],
      channelIds: [],
    });

    if (!trialRole) {
      throw new InternalServerError("Error creating role for admin");
    }
    await this.administratorService.assignRole(ctx, 1, trialRole.id);

    await this.roleService.assignRoleToChannel(ctx, trialRole.id, channel.id);

    const newAdminCtx = await this.getSuperAdminContext(ctx, "shop");
    await this.administratorService.assignRole(
      newAdminCtx,
      administrator.id,
      trialRole.id,
    );
    try {
      const data =
        await this.stockLocationService.assignStockLocationsToChannel(
          newAdminCtx,
          {
            channelId: channel.id,
            stockLocationIds: [stockLocationId as ID],
          },
        );
    } catch (error: any) {
      console.log("Stock location assignment error:", error.message);
    }
    this.eventBus.publish(
      new SellerRegistrationVerifiedEvent(
        ctx,
        entity.email,
        entity.businessName,
        entity.email,
        tempPassword,
        `${process.env.SERVER_URL}admin`,
      ),
    );
    return channel;
  }

  private async getSuperAdminContext(
    ctx: RequestContext,
    apiType: ApiType,
  ): Promise<RequestContext> {
    const { superadminCredentials } = this.configService.authOptions;
    const superAdminUser = await this.connection
      .getRepository(ctx, User)
      .findOne({
        where: {
          identifier: superadminCredentials.identifier,
        },
        relations: ["roles", "roles.channels", "roles.channels.stockLocations"],
      });
    if (!superAdminUser) {
      throw new InternalServerError("Super admin not found");
    }

    if (superAdminUser.roles) {
      for (const role of superAdminUser.roles) {
        if (!role.channels) {
          role.channels = [];
        }
      }
    }
    return this.requestContextService.create({
      apiType,
      user: superAdminUser,
    });
  }
}

