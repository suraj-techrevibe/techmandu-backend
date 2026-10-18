import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T;
export type InputMaybe<T> = T;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string | number; output: string | number; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: any; output: any; }
  JSON: { input: any; output: any; }
  LogicalOperator: { input: any; output: any; }
  Money: { input: number; output: number; }
  StringOperators: { input: any; output: any; }
};

export type Invoice = {
  __typename?: 'Invoice';
  accountingReference?: Maybe<InvoiceAccountingReference>;
  createdAt?: Maybe<Scalars['DateTime']['output']>;
  downloadUrl: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  invoiceNumber: Scalars['Int']['output'];
  isCreditInvoice: Scalars['Boolean']['output'];
  orderCode: Scalars['String']['output'];
  orderId: Scalars['ID']['output'];
  orderTotals: InvoiceOrderTotals;
};

export type InvoiceAccountingReference = {
  __typename?: 'InvoiceAccountingReference';
  errorMessage?: Maybe<Scalars['String']['output']>;
  link?: Maybe<Scalars['String']['output']>;
  reference?: Maybe<Scalars['String']['output']>;
};

export type InvoiceConfig = {
  __typename?: 'InvoiceConfig';
  createCreditInvoices: Scalars['Boolean']['output'];
  enabled: Scalars['Boolean']['output'];
  id: Scalars['ID']['output'];
  templateString: Scalars['String']['output'];
};

export type InvoiceConfigInput = {
  createCreditInvoices?: InputMaybe<Scalars['Boolean']['input']>;
  enabled: Scalars['Boolean']['input'];
  templateString?: InputMaybe<Scalars['String']['input']>;
};

export type InvoiceList = {
  __typename?: 'InvoiceList';
  items: Array<Invoice>;
  totalItems: Scalars['Int']['output'];
};

export type InvoiceListFilter = {
  invoiceNumber?: InputMaybe<Scalars['StringOperators']['input']>;
  orderCode?: InputMaybe<Scalars['StringOperators']['input']>;
};

export type InvoiceListOptions = {
  filter?: InputMaybe<InvoiceListFilter>;
  filterOperator?: InputMaybe<Scalars['LogicalOperator']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<Scalars['JSON']['input']>;
  take?: InputMaybe<Scalars['Int']['input']>;
};

/**
 * The order totals that were used to generate the invoice.
 * These are used to generate credit invoices.
 */
export type InvoiceOrderTotals = {
  __typename?: 'InvoiceOrderTotals';
  taxSummaries: Array<InvoiceTaxSummary>;
  total: Scalars['Money']['output'];
  totalWithTax: Scalars['Money']['output'];
};

export type InvoiceTaxSummary = {
  __typename?: 'InvoiceTaxSummary';
  description: Scalars['String']['output'];
  taxBase: Scalars['Money']['output'];
  taxRate: Scalars['Money']['output'];
  taxTotal: Scalars['Money']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Generate a new invoice for the given order. Creates a credit invoice if the order already has an invoice. */
  createInvoice: Invoice;
  /**
   * Export the given invoice to the configured accounting platform.
   * This is done via the Job Queue, so monitor invoice.accountingReference to see if the export succeeded.
   */
  exportInvoiceToAccountingPlatform: Scalars['Boolean']['output'];
  upsertInvoiceConfig: InvoiceConfig;
};


export type MutationCreateInvoiceArgs = {
  orderId: Scalars['ID']['input'];
};


export type MutationExportInvoiceToAccountingPlatformArgs = {
  invoiceNumber: Scalars['Int']['input'];
};


export type MutationUpsertInvoiceConfigArgs = {
  input?: InputMaybe<InvoiceConfigInput>;
};

export type Order = {
  __typename?: 'Order';
  invoices: Array<Invoice>;
};

export type Query = {
  __typename?: 'Query';
  invoiceConfig?: Maybe<InvoiceConfig>;
  invoices?: Maybe<InvoiceList>;
};


export type QueryInvoicesArgs = {
  options?: InputMaybe<InvoiceListOptions>;
};

export type UpsertInvoiceConfigMutationVariables = Exact<{
  input: InvoiceConfigInput;
}>;


export type UpsertInvoiceConfigMutation = { __typename?: 'Mutation', upsertInvoiceConfig: { __typename?: 'InvoiceConfig', id: string | number, enabled: boolean, createCreditInvoices: boolean, templateString: string } };

export type InvoiceConfigQueryVariables = Exact<{ [key: string]: never; }>;


export type InvoiceConfigQuery = { __typename?: 'Query', invoiceConfig?: { __typename?: 'InvoiceConfig', id: string | number, enabled: boolean, createCreditInvoices: boolean, templateString: string } };

export type InvoiceFieldsFragment = { __typename?: 'Invoice', id: string | number, createdAt?: any, invoiceNumber: number, isCreditInvoice: boolean, downloadUrl: string, accountingReference?: { __typename?: 'InvoiceAccountingReference', reference?: string, link?: string, errorMessage?: string } };

export type CreateInvoiceMutationVariables = Exact<{
  orderId: Scalars['ID']['input'];
}>;


export type CreateInvoiceMutation = { __typename?: 'Mutation', createInvoice: { __typename?: 'Invoice', id: string | number, createdAt?: any, invoiceNumber: number, isCreditInvoice: boolean, downloadUrl: string, accountingReference?: { __typename?: 'InvoiceAccountingReference', reference?: string, link?: string, errorMessage?: string } } };

export type ExportInvoiceToAccountingPlatformMutationVariables = Exact<{
  invoiceNumber: Scalars['Int']['input'];
}>;


export type ExportInvoiceToAccountingPlatformMutation = { __typename?: 'Mutation', exportInvoiceToAccountingPlatform: boolean };

export const InvoiceFieldsFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"invoiceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Invoice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"invoiceNumber"}},{"kind":"Field","name":{"kind":"Name","value":"isCreditInvoice"}},{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accountingReference"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"link"}},{"kind":"Field","name":{"kind":"Name","value":"errorMessage"}}]}}]}}]} as unknown as DocumentNode<InvoiceFieldsFragment, unknown>;
export const UpsertInvoiceConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"upsertInvoiceConfig"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"InvoiceConfigInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"upsertInvoiceConfig"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"createCreditInvoices"}},{"kind":"Field","name":{"kind":"Name","value":"templateString"}}]}}]}}]} as unknown as DocumentNode<UpsertInvoiceConfigMutation, UpsertInvoiceConfigMutationVariables>;
export const InvoiceConfigDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"invoiceConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"invoiceConfig"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"enabled"}},{"kind":"Field","name":{"kind":"Name","value":"createCreditInvoices"}},{"kind":"Field","name":{"kind":"Name","value":"templateString"}}]}}]}}]} as unknown as DocumentNode<InvoiceConfigQuery, InvoiceConfigQueryVariables>;
export const CreateInvoiceDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"createInvoice"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createInvoice"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"orderId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"orderId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"invoiceFields"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"invoiceFields"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Invoice"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"invoiceNumber"}},{"kind":"Field","name":{"kind":"Name","value":"isCreditInvoice"}},{"kind":"Field","name":{"kind":"Name","value":"downloadUrl"}},{"kind":"Field","name":{"kind":"Name","value":"accountingReference"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"reference"}},{"kind":"Field","name":{"kind":"Name","value":"link"}},{"kind":"Field","name":{"kind":"Name","value":"errorMessage"}}]}}]}}]} as unknown as DocumentNode<CreateInvoiceMutation, CreateInvoiceMutationVariables>;
export const ExportInvoiceToAccountingPlatformDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"exportInvoiceToAccountingPlatform"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"invoiceNumber"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"exportInvoiceToAccountingPlatform"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"invoiceNumber"},"value":{"kind":"Variable","name":{"kind":"Name","value":"invoiceNumber"}}}]}]}}]} as unknown as DocumentNode<ExportInvoiceToAccountingPlatformMutation, ExportInvoiceToAccountingPlatformMutationVariables>;