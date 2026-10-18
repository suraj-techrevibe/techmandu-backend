import gql from "graphql-tag";

export const questionAdminApiExtension = gql`
  type Answer implements Node {
    id: ID!
    text: String!
    question: Question!
  }

  type Question implements Node {
    id: ID!
    question: String!
    answer: Answer
    product: Product
    productVariant: ProductVariant
    askedBy: Customer!
  }

  input AnswerInput {
    id: ID!
    answer: String!
  }

  input AnswerUpdateInput {
    id: ID!
    answerId: ID!
    answer: String!
  }

  type AnswerResponse {
    success: Boolean!
    message: String!
  }

  extend type Mutation {
    createAnswer(input: AnswerInput): Answer!
    updateAnswer(input: AnswerUpdateInput): Answer!
    deleteAnswer(id: ID!): AnswerResponse!
  }
`;
