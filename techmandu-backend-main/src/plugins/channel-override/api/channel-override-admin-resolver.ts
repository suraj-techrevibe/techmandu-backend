import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Ctx, RequestContext, ChannelService, Channel, Permission, Allow, ShippingMethod, ShippingMethodService, Transaction, PaymentMethod, PaymentMethodService, UserService, TransactionalConnection, User, Relations, Administrator, RelationPaths, PaginatedList, AdministratorService } from '@vendure/core';
import { QueryAdministratorArgs, QueryAdministratorsArgs, QueryChannelsArgs } from '../../codegen/generated-admin-types';
import { IsNull } from 'typeorm';
@Resolver()
export class ChannelResolver {
  constructor(
    private channelService: ChannelService,
    private shippingMethodService: ShippingMethodService,
    private paymentMethodService: PaymentMethodService,
    private userService: UserService,
    private connection: TransactionalConnection,
    private administratorService: AdministratorService
  ) { }

  @Query()
  //@Allow(Permission.SuperAdmin)
  async channels(@Ctx() ctx: RequestContext, @Args() args: QueryChannelsArgs,) {
    const theUser = await this.connection.getRepository(ctx, User).findOne({
      where: {
        id: ctx.activeUserId,
        deletedAt: IsNull(),
      },
      relations: [
        'roles',
        'roles.channels'
      ]
    });
    const theRoles = theUser?.roles;
    if (theRoles?.find(role => role.code == "__super_admin_role__")) {
      const allChannels = await this.channelService.findAll(ctx, args.options);
      return allChannels;
    } else {
      const theChannels = theRoles?.map(role => role.channels)?.flat();
      const theChannelIDs = theChannels?.map(channel => channel?.id?.toString());
      if (!theChannelIDs || theChannelIDs?.length == 0) {
        return [];
      }
      const allChannels = await this.channelService.findAll(ctx, {
        filter: {
          id: {
            in: theChannelIDs
          }
        }
      });
      return allChannels;
    }
  }

  @Query()
  @Allow(Permission.Authenticated)
  async channel(@Ctx() ctx: RequestContext, @Args('id') id: string) {
    const channel = await this.channelService.findOne(ctx, id);
    const isSuperAdmin = ctx.userHasPermissions([Permission.SuperAdmin]);
    if (isSuperAdmin) {
      return channel;
    }
    if (ctx.channelId == id) {
      return channel;
    } else {
      throw new Error('Unauthorized Access');
    }
  }

 @Query()
@Allow(Permission.ReadAdministrator)
async administrators(
    @Ctx() ctx: RequestContext,
    @Args() args: QueryAdministratorsArgs,
    @Relations(Administrator) relations: RelationPaths<Administrator>,
) {
    console.log(ctx.activeUserId)
    
    if(ctx.activeUserId == 1){
        return await this.administratorService.findAll(ctx, args.options || undefined, relations);
    }
    else{
        const results = await this.administratorService.findAll(ctx, args.options || undefined, relations);    
        results.items = results.items.filter(admin => admin.user.id === ctx.activeUserId);
        results.totalItems = results.items.length;
        return results;
    }
}

    @Query()
    @Allow(Permission.ReadAdministrator)
    async administrator(
        @Ctx() ctx: RequestContext,
        @Args() args: QueryAdministratorArgs,
        @Relations(Administrator) relations: RelationPaths<Administrator>,
    ) {
        if(ctx.activeUserId ==1 ){
            return await this.administratorService.findOne(ctx, args.id, relations);
        }
        else{
          return await this.administratorService.findOneByUserId(ctx,ctx.activeUserId as string)
        }
    }
//   @Transaction()
//   @Mutation()
//   @Allow(Permission.CreateShippingMethod)
//   createShippingMethod(
//     @Ctx() ctx: RequestContext,
//     @Args() args: MutationCreateShippingMethodArgs,
//   ): Promise<ShippingMethod> {
//     const { input } = args;
//     return this.shippingMethodService.create(ctx, input);
//   }

//   @Transaction()
//   @Mutation()
//   @Allow(Permission.DeleteShippingMethod)
//   deleteShippingMethods(
//     @Ctx() ctx: RequestContext,
//     @Args() args: MutationDeleteShippingMethodsArgs,
//   ): Promise<DeletionResponse[]> {
//     return Promise.all(args.ids?.map(id => this.shippingMethodService.softDelete(ctx, id)) ?? []);
//   }

//   @Transaction()
//   @Mutation()
//   @Allow(Permission.DeleteShippingMethod)
//   deleteShippingMethod(
//     @Ctx() ctx: RequestContext,
//     @Args() args: MutationDeleteShippingMethodArgs,
//   ): Promise<DeletionResponse> {
//     const { id } = args;
//     return this.shippingMethodService.softDelete(ctx, id);
//   }

//   @Transaction()
//   @Mutation()
//   @Allow(Permission.CreatePaymentMethod)
//   createPaymentMethod(
//     @Ctx() ctx: RequestContext,
//     @Args() args: MutationCreatePaymentMethodArgs,
//   ): Promise<PaymentMethod> {
//     return this.paymentMethodService.create(ctx, args.input);
//   }


//   @Transaction()
//   @Mutation()
//   @Allow(Permission.DeletePaymentMethod)
//   deletePaymentMethods(
//     @Ctx() ctx: RequestContext,
//     @Args() args: MutationDeletePaymentMethodsArgs,
//   ): Promise<DeletionResponse[]> {
//     return Promise.all(args.ids.map(id => this.paymentMethodService.delete(ctx, id, args.force)));
//   }
//   @Transaction()
//   @Mutation()
//   @Allow(Permission.DeletePaymentMethod)
//   deletePaymentMethod(
//     @Ctx() ctx: RequestContext,
//     @Args() args: MutationDeletePaymentMethodArgs,
//   ): Promise<DeletionResponse> {
//     return this.paymentMethodService.delete(ctx, args.id, args.force);
//   }
} 