import { gql } from 'graphql-tag';

export const PAGE_FRAGMENT = gql`
    fragment PageFragment on Page {
        id
        title
        slug
        metaKeywords
        metaTitle
        metaDescription
        content
        enabled
        languageCode
        group {
            id
            name
            slug
            languageCode
            translations {
                id
                languageCode
                name
                slug
                createdAt
                updatedAt
            }
        }
        translations {
            id
            languageCode
            title
            slug
            metaKeywords
            metaTitle
            metaDescription
            content
        }
        createdAt
        updatedAt
    }
`;

export const PAGE_GROUP_FRAGMENT = gql`
    fragment PageGroup on PageGroup {
        id
        name
        slug
        createdAt
        updatedAt
        languageCode
        enabled
        translations {
            id
            languageCode
            name
            slug
        }
    }
`;
