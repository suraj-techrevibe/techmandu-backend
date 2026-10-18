import { gql } from 'graphql-tag';

export const commonApiExtensions = gql`
  type blog implements Node {
    id: ID!
    createdAt: DateTime!
    updatedAt: DateTime!
    name: String!
    slug: String!
    content: String!
    metaTags: String
    metaTitle: String
    metaDescription: String
  }

  type blogList implements PaginatedList {
    items: [blog!]!
    totalItems: Int!
  }

  input blogListOptions
`;

export const adminApiExtensions = gql`
  ${commonApiExtensions}

  input CreateblogInput {
    name: String!
    slug: String!
    content: String!
    metaTags: String
    metaTitle: String
    metaDescription: String
  }

  input UpdateblogInput {
    id: ID!
    name: String
    slug: String
    content: String
    metaTags: String
    metaTitle: String
    metaDescription: String
  }

  extend type Query {
    blogs(options: blogListOptions): blogList!
    blog(id: ID!): blog!
  }

  extend type Mutation {
    createBlog(input: CreateblogInput!): blog!
    updateBlog(input: UpdateblogInput!): blog!
    deleteBlog(id: ID!): DeletionResponse!
  }
`;

export const shopApiExtensions = gql`
  ${commonApiExtensions}

  extend type Query {
    blogs(options: blogListOptions): blogList!
    blogBySlug(slug: String!): blog!
  }
`;
