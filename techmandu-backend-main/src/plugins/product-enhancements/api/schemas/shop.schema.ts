import { gql } from "graphql-tag";

export const shopApiExtensions = gql`
  type Banner {
    id: ID!
    title: String!
    description: String!
    ctaText: String!
    ctaLink: String!
    image: Asset!
    createdAt: DateTime!
    updatedAt: DateTime!
    price: Int!
  }

  extend type Query {
    heroSectionBanners: [Banner!]!
    relatedProducts(productSlug: String!): [Product!]!
    heroSectionBanner(id: ID!): Banner
  }
  extend type Mutation {
    createTestBanner(
      title: String!
      description: String!
      ctaText: String!
      ctaLink: String!
      imageId: ID!
      price: Int
    ): Banner!

    updateBanner(
      id: ID!
      title: String!
      description: String!
      ctaText: String!
      ctaLink: String!
      imageId: ID!
      price: Int
    ): Banner!

    deleteBanner(id: ID!): DeleteBannerResponse!
  }
  type DeleteBannerResponse {
    result: Boolean!
  }
`;
