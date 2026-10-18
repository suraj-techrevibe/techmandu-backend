import gql from 'graphql-tag';

const biddingHistoryAdminApiExtensions = gql`
  type BiddingHistory implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    variantId: Int!
    initialPrice: Int!
    finalPrice: Int!
    isVerified: Boolean!
  }

  type BiddingHistoryList implements PaginatedList {
    items: [BiddingHistory!]!
    totalItems: Int!
  }

  # Generated at run-time by Vendure
  input BiddingHistoryListOptions

  extend type Query {
    biddingHistory(id: ID!): BiddingHistory
    biddingHistorys(options: BiddingHistoryListOptions): BiddingHistoryList!
  }

  input CreateBiddingHistoryInput {
    variantId: Int!
    initialPrice: Int!
    finalPrice: Int!
    isVerified: Boolean!
  }

  input UpdateBiddingHistoryInput {
    id: ID!
    variantId: Int
    initialPrice: Int
    finalPrice: Int
    isVerified: Boolean
  }

   extend type Mutation {
    # createBiddingHistory(input: CreateBiddingHistoryInput!): BiddingHistory!
    # updateBiddingHistory(input: UpdateBiddingHistoryInput!): BiddingHistory!
    # deleteBiddingHistory(id: ID!): DeletionResponse!
    updateBidding(id:ID!, isAccepted:Boolean!,newProposedPrice:Int, enableVariant:Boolean!): Boolean!
  }
`;
export const adminApiExtensions = gql`
  ${biddingHistoryAdminApiExtensions}
`;
