import { gql } from 'graphql-tag';

import { PAGE_FRAGMENT } from '../../common/fragment.graphql';

export const PAGE = gql`
    query GetPageDetail($id: ID!) {
        page(id: $id) {
            ...PageFragment
        }
    }
    ${PAGE_FRAGMENT}
`;

export const CREATE_PAGE = gql`
    mutation CreatePage($input: CreatePageInput!) {
        createPage(input: $input) {
            ...PageFragment
        }
    }
    ${PAGE_FRAGMENT}
`;

export const UPDATE_PAGE = gql`
    mutation UpdatePage($input: UpdatePageInput!) {
        updatePage(input: $input) {
            ...PageFragment
        }
    }
    ${PAGE_FRAGMENT}
`;

export const GET_PAGE_GROUPS_SELECT_OPTIONS = gql`
    query GetPageGroupsSelectOptions {
        pageGroups {
            items {
                id
                name
            }
            totalItems
        }
    }
`;
