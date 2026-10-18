import gql from 'graphql-tag';

const businessAccountAdminApiExtensions = gql`
  extend type Query {
    businessAccounts(options: CustomerListOptions): CustomerList!
    businessAccount(id: ID!): Customer
  }

  extend type Mutation {
    verifyBusinessAccount(
      id: ID!
      isVerified: Boolean!
    ): Customer!
  }
`;

export const adminApiExtensions = gql`
  ${businessAccountAdminApiExtensions}
`;


