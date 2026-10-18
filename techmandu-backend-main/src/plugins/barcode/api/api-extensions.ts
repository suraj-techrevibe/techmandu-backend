import gql from 'graphql-tag';

const barcodeAdminApiExtensions = gql`

  input PosOrderInput {
    serialCode: String!
    requestToken: String!
  }
  extend input AddItemToDraftOrderInput {
  serialCode: [String]
 }
  
  type posOrderResponse {
    success: Boolean!
    message: String!
  }
  extend type Query {
    searchProductVariantBySerialCode(serialCode: String!): ProductVariant
  }
  extend type Mutation {
    posOrder(input: PosOrderInput): posOrderResponse!
  }
`;
export const adminApiExtensions = gql`
  ${barcodeAdminApiExtensions}
`;
