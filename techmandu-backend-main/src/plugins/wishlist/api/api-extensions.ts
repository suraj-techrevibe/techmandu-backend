import { gql } from 'graphql-tag';

export const shopApiExtensions = gql`
    type WishlistItem implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        productVariant: ProductVariant!
    }

    type WishlistItemList implements PaginatedList {
        items: [WishlistItem!]!
        totalItems: Int!
    }

    input WishlistItemListOptions

    extend type Query {
        wishlists(options: WishlistItemListOptions): WishlistItemList!
    }

    extend type Mutation {
        addToWishlist(productVariantId: ID!): WishlistItem!
        """
        Removes a wishlist by its id or product variant id. If neither 'id' nor 'slug' is specified, an error will result.
        """
        removeFromWishlist(id: ID, productVariantId: ID): DeletionResponse!
    }

    extend type ProductVariant {
        isInWishlist: Boolean!
    }
`;
