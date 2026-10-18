import { gql } from "graphql-tag";


export const shopApiExtension = gql`
    extend type Query {
        navBarCollections: [Collection!]!
    }
`;