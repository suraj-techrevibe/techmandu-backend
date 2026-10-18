import gql from "graphql-tag";

export const questionShopApiExtension = gql`
  type Question implements Node {
    id: ID!
    question: String!
    answer: Answer
    product: Product
    productVariant: ProductVariant
    askedBy: Customer!
  }

  type Answer implements Node {
    id: ID!
    text: String!
    question: Question!
  }

  input QuestionCreateInput {
    question: String!
    product: ID
    productVariant: ID
  }

  input QuestionEditInput {
    id: ID!
    question: String
    product: ID
    productVariant: ID
  }

  type QuestionResponse {
    success: Boolean!
    message: String!
  }
  extend type Query {
    questionForProduct(id: ID!): [Question!]!
    questionForVariant(id: ID!): [Question!]!
  }
  extend type Mutation {
    createQuestion(input: QuestionCreateInput): Question!
    updateQuestion(input: QuestionEditInput): Question!
    deleteQuestion(id: ID!): QuestionResponse!
  }
`;
