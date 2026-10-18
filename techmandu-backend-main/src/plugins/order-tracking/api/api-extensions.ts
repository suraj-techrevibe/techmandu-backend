import { gql } from 'graphql-tag';

export const orderTrackingApiExtensions = gql`
  extend type Query {
    trackOrder(orderCode: String!, email: String!): Order
  }
`;