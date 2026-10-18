import gql from 'graphql-tag';

import { PAGE_GROUP_FRAGMENT } from '../../common/fragment.graphql';

export const GET_PAGE_GROUPS = gql`
    query GetPageGroups($options: PageGroupListOptions) {
        pageGroups(options: $options) {
            items {
                ...PageGroup
            }
            totalItems
        }
    }
    ${PAGE_GROUP_FRAGMENT}
`;

export const DELETE_PAGE_GROUPS = gql`
    mutation DeletePageGroups($ids: [ID!]!) {
        deletePageGroup(ids: $ids) {
            result
            message
        }
    }
`;
