import { gql } from "graphql-tag";

export const adminApiExtension = gql`
  extend type Query {
    customerPromotionUsage(
      options: PromotionUsageListOptions
    ): PromotionUsageList!
    orderPlacedBonus: [OrderBonus!]!
    signupBonus: Int!
  }

  input PromotionUsageListOptions {
    page: Int = 1
    pageSize: Int = 10
  }

  type PromotionUsageList {
    items: [PromotionUsage!]!
    totalItems: Int!
  }

  type PromotionUsage {
    customer: CustomerSummary!
    couponCode: String!
    discountAmount: Int! # Vendure Money scalar is Int (minor units)
    currencyCode: String!
    orderId: ID!
    orderCode: String!
    createdAt: DateTime!
  }

  type CustomerSummary {
    firstName: String
    lastName: String
    email: String
  }

  type OrderBonus implements Node {
    id: ID!
    name: String!
    minOrderValue: Int!
    maxOrderValue: Int
    coins: Int!
    rewardInterval: Int
    description: String!
  }
`;
