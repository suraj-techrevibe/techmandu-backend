import { gql } from "graphql-tag";

export const adminApiExtension = gql`
  type NcmWorkbenchRow {
    orderId: ID!
    code: String!
    placedAt: String
    customerName: String
    recipientName: String
    recipientPhone: String
    phoneValid: Boolean!
    destination: String
    currencyCode: String!
    total: Int!
    cashToCollectNpr: Int
    ncmTrackingId: String
    problems: [String!]!
    canBook: Boolean!
  }

  type NcmWorkbenchList {
    items: [NcmWorkbenchRow!]!
    totalItems: Int!
  }

  type NcmBookingOutcome {
    orderId: ID!
    orderCode: String!
    trackingId: String
    alreadyBooked: Boolean!
    error: String
  }

  type NcmTrackingStatus {
    trackingId: String!
    status: String!
    addedTime: String
    vendorReturn: Boolean
  }

  extend type Query {
    ncmWorkbench(skip: Int, take: Int, onlyBookable: Boolean): NcmWorkbenchList!
    ncmTrackingStatus(trackingId: String!): NcmTrackingStatus!
  }

  extend type Mutation {
    ncmBookOrders(orderIds: [ID!]!): [NcmBookingOutcome!]!
  }
`;
