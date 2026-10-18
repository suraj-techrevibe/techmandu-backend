import { gql } from "graphql-tag";

export const shopApiExtension = gql`
  type OrderStatus {
    orderid: Int!
    status: String!
    added_time: String!
    vendor_return: Boolean!
  }
  type MessageResponse {
    message: String!
    status: Boolean!
  }
  type BranchListResponse {
    branches: [String!]!
  }
  type CityListResponse {
    cities: [String!]!
  }
  type RingRoadListResponse {
    ringroad: [String!]!
  }
  type AreasListResponse {
    areas: [String!]!
  }

  extend type Query {
    getOrderStatus(orderId: ID!): OrderStatus!
  }
  extend type Mutation {
    addNcmBranchToOrder(
      destinationBranch: String!
      orderId: ID!
    ): MessageResponse!

    addOrderNote(note: String!, orderId: ID!): MessageResponse!
    valleyStatus(outOfValley: Boolean!, orderId: ID!): MessageResponse!
  }
`;
