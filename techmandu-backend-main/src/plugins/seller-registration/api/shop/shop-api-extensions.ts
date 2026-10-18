import gql from 'graphql-tag';

const sellerRegistrationShopApiExtensions = gql`
type SellerRegistration implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    panNo: String!
    businessName: String!
    businessRegistrationNo: String!
    address: String
    ownerName: String!
    phone: String!
    email: String!
    isVerified: Boolean!
  }

  input CreateSellerRegistrationInput {
    panNo: String!
    businessName: String!
    businessRegistrationNo: String!
    address: String
    ownerName: String!
    phone: String!
    email: String!
  }

input createSellerUserInput {
    password: String!
    registrationId: String!
  }

  type createSellerResponse {
    message: String!
    status: Boolean!
  }

  extend type Mutation {
    
    # createSeller(input: createSellerUserInput!): createSellerResponse
    createSellerRegistration(input: CreateSellerRegistrationInput!): SellerRegistration!
  }
`;

export const shopApiExtensions = gql`
  ${sellerRegistrationShopApiExtensions}
`;
