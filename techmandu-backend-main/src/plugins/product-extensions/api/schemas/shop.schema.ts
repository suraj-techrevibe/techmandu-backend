import { gql } from 'graphql-tag';

export const shopApiExtensions = gql`

type CurrencyExchangeRateResponse {
    usd: String
    npr: String
    aud: String
  }

  extend type Query {
    highestSellingProduct(take:Int!): ProductList
    currencyExchangeRate:CurrencyExchangeRateResponse
  }
`;