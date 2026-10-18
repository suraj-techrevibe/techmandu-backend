import gql from 'graphql-tag';

const sellerRegistrationAdminApiExtensions = gql`
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
    panPhoto: Asset
    documents: [Asset!]!
  }

  input SellerRegistrationListOptions
  
  type SellerRegistrationList implements PaginatedList {
    items: [SellerRegistration!]!
    totalItems: Int!
  }

  extend type Query {
    sellerRegistration(id: ID!): SellerRegistration
    sellerRegistrations(options: SellerRegistrationListOptions): SellerRegistrationList!
    verifiedSellerRegistrations(options: SellerRegistrationListOptions): SellerRegistrationList!
  }


 
type verifySellerRegistrationResponse {
  message: String!
  success: Boolean!
}
  
  extend type Mutation {
    deleteSellerRegistration(id: ID!): DeletionResponse!
    verifySellerRegistration(id: ID!,stockLocationId: ID): verifySellerRegistrationResponse!
  }
`;

export const adminApiExtensions = gql`
  ${sellerRegistrationAdminApiExtensions}
`;
