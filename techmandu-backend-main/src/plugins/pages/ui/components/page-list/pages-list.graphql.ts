import { gql } from 'graphql-tag';

import { PAGE_FRAGMENT } from '../../common/fragment.graphql';

export const PAGES = gql`
    query GetPageList($options: PageListOptions) {
        pages(options: $options) {
            items {
                ...PageFragment
            }
            totalItems
        }
    }
    ${PAGE_FRAGMENT}
`;

export const DELETE_PAGES = gql`
    mutation DeletePages($ids: [ID!]!) {
        deletePage(ids: $ids) {
            message
            result
        }
    }
    ${PAGE_FRAGMENT}
`;

export const ASSIGN_PAGES_TO_CHANNELS = gql`
    mutation AssignPagesToChannels($input: AssignPagesToChannelsInput!) {
        assignPagesToChannels(input: $input) {
            ...PageFragment
        }
    }
    ${PAGE_FRAGMENT}
`;

export const REMOVE_PAGES_FROM_CURRENT_CHANNEL = gql`
    mutation RemovePagesFromCurrentChannel($pageIds: [ID!]!) {
        removePagesFromCurrentChannel(pageIds: $pageIds) {
            ...PageFragment
        }
    }
    ${PAGE_FRAGMENT}
`;
