import { gql } from 'graphql-tag';

const common = gql`
    type PageGroup implements Node {
        id: ID!
        name: String!
        slug: String!
        languageCode: LanguageCode
        pages(options: PageListOptions): PageList!
        enabled: Boolean!
        translations: [PageGroupTranslation!]!
        createdAt: DateTime!
        updatedAt: DateTime!
    }

    type PageGroupTranslation implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        languageCode: LanguageCode!
        name: String!
        slug: String!
    }

    input PageGroupListOptions

    type PageGroupList implements PaginatedList {
        items: [PageGroup!]!
        totalItems: Int!
    }

    type Page implements Node {
        id: ID!
        title: String!
        slug: String!
        metaTitle: String
        metaKeywords: String
        metaDescription: String
        content: String!
        enabled: Boolean!
        languageCode: LanguageCode
        translations: [PageTranslation!]!
        createdAt: DateTime!
        updatedAt: DateTime!
        group: PageGroup
    }

    type PageTranslation implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        languageCode: LanguageCode!
        title: String!
        slug: String!
        metaTitle: String
        metaKeywords: String
        metaDescription: String
        content: String!
    }
    type PageList implements PaginatedList {
        items: [Page!]!
        totalItems: Int!
    }

    input PageListOptions

    extend type Query {
        """
        Get a Page either by id or slug. If neither id nor slug is specified, an error will result.
        """
        page(id: ID, slug: String): Page
        pages(options: PageListOptions): PageList!
        pageGroup(id: ID, slug: String): PageGroup
        pageGroups(options: PageGroupListOptions): PageGroupList!
    }
`;

export const shopApiExtensions = gql`
    ${common}
`;

export const adminApiExtensions = gql`
    ${common}

    input CreatePageGroupInput {
        enabled: Boolean
        translations: [PageGroupTranslationInput!]!
    }

    input UpdatePageGroupInput {
        id: ID!
        enabled: Boolean
        translations: [PageGroupTranslationInput!]!
    }

    input PageGroupTranslationInput {
        id: ID
        languageCode: LanguageCode!
        name: String!
        slug: String
    }

    input PageTranslationInput {
        id: ID
        languageCode: LanguageCode!
        title: String!
        slug: String!
        metaTitle: String
        metaKeywords: String
        metaDescription: String
        content: String!
    }

    input CreatePageInput {
        enabled: Boolean!
        group: ID
        translations: [PageTranslationInput!]!
    }

    input UpdatePageInput {
        id: ID!
        group: ID
        enabled: Boolean
        translations: [PageTranslationInput!]!
    }

    input AssignPagesToChannelsInput {
        channelIds: [ID]!
        pageIds: [ID!]!
    }

    input AssignPagesToGroupInput {
        groupId: ID!
        pageIds: [ID!]!
    }

    input RemovePagesFromGroupInput {
        groupId: ID!
        pageIds: [ID!]!
    }

    extend type Mutation {
        createPageGroup(input: CreatePageGroupInput!): PageGroup!
        updatePageGroup(input: UpdatePageGroupInput!): PageGroup!
        deletePageGroup(ids: [ID!]!): DeletionResponse!
        assignPagesToGroup(input: AssignPagesToGroupInput!): PageGroup!
        removePagesFromGroup(input: RemovePagesFromGroupInput!): PageGroup!

        createPage(input: CreatePageInput!): Page!
        updatePage(input: UpdatePageInput!): Page!
        deletePage(ids: [ID!]!): DeletionResponse!
        assignPagesToChannels(input: AssignPagesToChannelsInput!): [Page!]!
        removePagesFromCurrentChannel(pageIds: [ID!]!): [Page!]!
    }
`;
