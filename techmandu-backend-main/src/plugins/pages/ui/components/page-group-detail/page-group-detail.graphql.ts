import gql from 'graphql-tag';

import { PAGE_GROUP_FRAGMENT } from '../../common/fragment.graphql';

export const GET_PAGE_GROUP = gql`
    query GetPageGroup($id: ID!) {
        pageGroup(id: $id) {
            ...PageGroup
        }
    }
    ${PAGE_GROUP_FRAGMENT}
`;

export const CREATE_PAGE_GROUP = gql`
    mutation CreatePageGroup($input: CreatePageGroupInput!) {
        createPageGroup(input: $input) {
            ...PageGroup
        }
    }
    ${PAGE_GROUP_FRAGMENT}
`;

export const UPDATE_PAGE_GROUP = gql`
    mutation UpdatePageGroup($input: UpdatePageGroupInput!) {
        updatePageGroup(input: $input) {
            ...PageGroup
        }
    }
    ${PAGE_GROUP_FRAGMENT}
`;
