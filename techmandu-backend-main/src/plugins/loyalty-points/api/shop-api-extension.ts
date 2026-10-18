import { gql } from 'graphql-tag';

export const shopApiExtension = gql`

  enum TechCoinTransactionType {
    EARNED
    REDEEMED 
    REVERTED
  }

  enum TechCoinType {
    ORDER
    REGISTER
  }

  extend type Query {
    loyaltyCouponCodes: [String]
    orderPlacedBonus: [OrderBonus!]!
    signupBonus: Int!
    techcoinTrasnsactions(customerId: ID!): [TechCoinTransaction!]!
  }

  extend type Customer {
    availableLoyaltyPoints: Int!
  }

extend type Mutation{
reedemTechCoins(orderId: ID!, coins: Int!): RedeemTechCoinResult!
revertTechCoinRedemption(orderId: ID!): TechCoinsReedemResponse!
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

  type TechCoinTransaction implements Node {
    id: ID!
    customer: Customer!
    customerId: ID!
    order: Order 
    points: Int!
    type: TechCoinTransactionType!
    loyaltyPointsType: TechCoinType!
    description: String
    orderCode: String
  }

    type InsufficientLoyaltyPointsError implements ErrorResult {
        message: String!
        errorCode: ErrorCode!
    }

  type TechCoinsReedemResponse {
  success: Boolean!
  message: String!
  }

    union RedeemTechCoinResult = TechCoinsReedemResponse | InsufficientLoyaltyPointsError
`;
