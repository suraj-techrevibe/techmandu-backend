import gql from 'graphql-tag';

const qrManualPaymentShopApiExtensions = gql`
  type AddQrPaymentProofResponse {
    success: Boolean!
    message: String!
  }
  extend type Mutation {
    addQrPaymentProof(assetId: ID!, orderCode: String!): AddQrPaymentProofResponse!
  }
`;
export const shopApiExtensions = gql`
  ${qrManualPaymentShopApiExtensions}
`;
