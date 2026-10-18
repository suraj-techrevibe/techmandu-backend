import { gql } from 'graphql-tag';

export const GET_BANNER = gql`
    query GetBanner($id: ID!) {
        heroSectionBanner(id: $id) {
            id
            title
            description
            ctaText
            ctaLink
            image {
                id
                preview
            }
        }
    }
`;

export const CREATE_BANNER = gql`
    mutation CreateTestBanner(
        $title: String!
        $description: String!
        $ctaText: String!
        $ctaLink: String!
        $imageId: ID!
    ) {
        createTestBanner(
            title: $title
            description: $description
            ctaText: $ctaText
            ctaLink: $ctaLink
            imageId: $imageId
        ) {
            id
            title
            description
            ctaText
            ctaLink
            image {
                id
                preview
            }
        }
    }
`;

export const UPDATE_BANNER = gql`
    mutation UpdateBanner(
        $id: ID!
        $title: String!
        $description: String!
        $ctaText: String!
        $ctaLink: String!
        $imageId: ID!
    ) {
        updateBanner(
            id: $id
            title: $title
            description: $description
            ctaText: $ctaText
            ctaLink: $ctaLink
            imageId: $imageId
        ) {
            id
            title
            description
            ctaText
            ctaLink
            image {
                id
                preview
            }
        }
    }
`;

export const DELETE_BANNER = gql`
    mutation DeleteBanner($id: ID!) {
        deleteBanner(id: $id)
    }
`;