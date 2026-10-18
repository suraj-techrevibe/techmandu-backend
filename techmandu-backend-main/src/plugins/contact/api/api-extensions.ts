import gql from 'graphql-tag';

const commonApiExtensions = gql`
    type Contact implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        name: String!
        emailAddress: String!
        phone: String!
        subject: String!
        message: String!
    }

    type ContactList implements PaginatedList {
        items: [Contact!]!
        totalItems: Int!
    }

    input ContactListOptions

    extend type Query {
        contact(id: ID!): Contact
        contacts(options: ContactListOptions): ContactList!
    }
`;

export const adminApiExtensions = gql`
    ${commonApiExtensions}

    extend type Mutation {
        deleteContact(id: ID!): DeletionResponse!
        deleteContacts(ids: [ID!]!): [DeletionResponse!]!
    }
`;

export const shopApiExtensions = gql`
    ${commonApiExtensions}

    input CreateContactInput {
        name: String!
        emailAddress: String!
        phone: String!
        subject: String!
        message: String!
    }

    extend type Mutation {
        createContact(input: CreateContactInput!): Contact!
    }
`;
