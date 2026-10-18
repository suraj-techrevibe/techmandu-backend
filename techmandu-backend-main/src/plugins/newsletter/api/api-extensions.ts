import gql from 'graphql-tag';

const newsletterSubscriberAdminApiExtensions = gql`
    type NewsletterSubscriber implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        email: String!
        name: String
        source: String
    }

    type NewsletterSubscriberList implements PaginatedList {
        items: [NewsletterSubscriber!]!
        totalItems: Int!
    }

    input NewsletterSubscriberFilterParameter {
        email: StringOperators
        createdAt: DateOperators
    }

    input NewsletterSubscriberSortParameter {
        createdAt: SortOrder
        email: SortOrder
    }

    # Generated at run-time by Vendure
    input NewsletterSubscriberListOptions

    extend type Query {
        newsletterSubscriber(id: ID!): NewsletterSubscriber
        newsletterSubscribers(options: NewsletterSubscriberListOptions): NewsletterSubscriberList!
    }

    input CreateNewsletterSubscriberInput {
        email: String!
        name: String
        source: String
    }

    input UpdateNewsletterSubscriberInput {
        id: ID!
        email: String
        name: String
        source: String
    }

    extend type Mutation {
        createNewsletterSubscriber(input: CreateNewsletterSubscriberInput!): NewsletterSubscriber!
        updateNewsletterSubscriber(input: UpdateNewsletterSubscriberInput!): NewsletterSubscriber!
        deleteNewsletterSubscriber(id: ID!): DeletionResponse!
    }
`;

const newsletterSubscriberShopApiExtensions = gql`
    input SubscribeToNewsletterInput {
        email: String!
        name: String
        source: String
    }

    type SubscribeToNewsletterResult {
        success: Boolean!
        created: Boolean!
    }

    input UnsubscribeFromNewsletterInput {
        email: String!
    }

    type UnsubscribeFromNewsletterResult {
        success: Boolean!
        removed: Boolean!
    }

    extend type Mutation {
        subscribeToNewsletter(input: SubscribeToNewsletterInput!): SubscribeToNewsletterResult!
        unsubscribeFromNewsletter(input: UnsubscribeFromNewsletterInput!): UnsubscribeFromNewsletterResult!
    }
`;

export const adminApiExtensions = gql`
    ${newsletterSubscriberAdminApiExtensions}
`;

export const shopApiExtensions = gql`
    ${newsletterSubscriberShopApiExtensions}
`;