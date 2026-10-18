import {
  Asset,
  AssetService,
  AuthenticationStrategy,
  Customer,
  CustomerService,
  ExternalAuthenticationService,
  Injector,
  Logger,
  RequestContext,
  TransactionalConnection,
  User,
  UserService,
  isGraphQlErrorResult,
} from "@vendure/core";
import { OAuth2Client } from "google-auth-library";
import { DocumentNode } from "graphql";
import gql from "graphql-tag";
import { Readable } from "stream";
import { MethodNotAllowedException } from "@nestjs/common";
export type GoogleAuthData = {
  token: string;
};

export class GoogleAuthenticationStrategy
  implements AuthenticationStrategy<GoogleAuthData> {
  readonly name = "google";
  private client: OAuth2Client;
  private externalAuthenticationService: ExternalAuthenticationService;
  private assetService: AssetService;
  private connection: TransactionalConnection;
  private customerService: CustomerService;
  private userService: UserService;

  constructor(private clientId: string) {
    this.client = new OAuth2Client(clientId);
  }

  init(injector: Injector) {
    this.externalAuthenticationService = injector.get(
      ExternalAuthenticationService,
    );
    this.assetService = injector.get(AssetService);
    this.connection = injector.get(TransactionalConnection);
    this.customerService = injector.get(CustomerService);
    this.userService = injector.get(UserService);
  }

  defineInputType(): DocumentNode {
    return gql`
      input GoogleAuthInput {
        token: String!
      }
    `;
  }

  async authenticate(
    ctx: RequestContext,
    data: GoogleAuthData,
  ): Promise<User | false> {
    let ticket;
    try {
      ticket = await this.client.verifyIdToken({
        idToken: data.token,
        audience: this.clientId,
      });
    } catch (error) {
      if (this.isExpiredTokenError(error)) {
        Logger.warn(
          "Google auth: received expired token during login attempt",
          "GoogleAuth",
        );
        return false;
      }

      const message = error instanceof Error ? error.message : String(error);
      Logger.error(
        `Google auth: token verification failed - ${message}`,
        "GoogleAuth",
      );
      throw error;
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return false;
    }

    const externalIdentifier = payload.sub ?? payload.email;
    if (!externalIdentifier) {
      Logger.error(
        "Google auth: missing subject and email from token payload",
        "GoogleAuth",
      );
      return false;
    }

    const user = await this.externalAuthenticationService.findCustomerUser(
      ctx,
      this.name,
      externalIdentifier,
    );

    if (user) {
      return user;
    }

    const newUser =
      await this.externalAuthenticationService.createCustomerAndUser(ctx, {
        strategy: this.name,
        externalIdentifier,
        verified: payload.email_verified || false,
        emailAddress: payload.email,
        firstName: payload.given_name || "Google",
        lastName: payload.family_name || "User",
      });

    // Add native authentication method to enable password reset
    try {
      await this.userService.addNativeAuthenticationMethod(
        ctx,
        newUser,
        payload.email,
        undefined, // No password set - user can set it via password reset
      );
      Logger.info(
        `added native auth method for ${payload.email}`,
        "GoogleAuth",
      );
    } catch (error) {
      Logger.warn(
        `failed to add native auth method for ${payload.email}: ${(error as Error).message}`,
        "GoogleAuth",
      );
    }

    const customer = await this.customerService.findOneByUserId(
      ctx,
      newUser.id,
    );

    if (!customer) {
      throw new MethodNotAllowedException("Customer not found");
    }

    await this.connection.getRepository(ctx, Customer).save(customer);

    if (payload.picture) {
      try {
        const avatar = await this.getAssetFromUrl(
          ctx,
          payload.picture,
          `${payload.given_name}_${payload.family_name}`,
        );
        if (avatar) {
          const customer = await this.customerService.findOneByUserId(
            ctx,
            newUser.id,
          );

          if (!customer) {
            throw new MethodNotAllowedException("Customer not found");
          }

          customer.customFields.avatar = avatar;
          await this.connection.getRepository(ctx, Customer).save(customer);
        }
      } catch (error) {
        Logger.warn(
          `failed to attach avatar for ${payload.email}: ${(error as Error).message}`,
          "GoogleAuth",
        );
      }
    }

    return newUser;
  }

  async getAssetFromUrl(ctx: RequestContext, imageUrl: string, name: string) {
    try {
      const response = await fetch(imageUrl);
      const arrBuffer = await response.arrayBuffer();

      const asset = await this.assetService.createFromFileStream(
        Readable.from(Buffer.from(arrBuffer)),
        `${name}_${Date.now().toString()}.png`,
        ctx,
      );

      if (!isGraphQlErrorResult(asset)) {
        return await this.connection.getRepository(ctx, Asset).save(asset);
      }

      Logger.warn(
        `asset creation returned GraphQL error for ${imageUrl}`,
        "GoogleAuth",
      );
    } catch (error) {
      Logger.warn(
        `failed to fetch avatar from ${imageUrl}: ${(error as Error).message}`,
        "GoogleAuth",
      );
    }
  }

  private isExpiredTokenError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      /token used too late/i.test(message) || /token has expired/i.test(message)
    );
  }
}
