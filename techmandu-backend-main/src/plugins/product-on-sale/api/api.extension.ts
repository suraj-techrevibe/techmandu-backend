import gql from "graphql-tag";

export const salesShopApiExtensions = gql`
  extend type Query {
    getAllProductsOnSale: [ProductVariant!]
  }

  extend type Query {
    getAllPromotionsForProduct(productId: ID!): [Promotion!]
  }
`;
