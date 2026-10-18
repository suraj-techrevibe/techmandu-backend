import { ErrorResult } from '@vendure/core';
import { ErrorCode } from '../../codegen/generated-shop-types';

export class InsufficientLoyaltyPointsError extends ErrorResult {
  readonly __typename = 'InsufficientLoyaltyPointsError';
  readonly errorCode: ErrorCode = ErrorCode.INSUFFICIENT_LOYALTY_POINTS_ERROR;
  readonly message: string = 'INSUFFICIENT_LOYALTY_POINTS_ERROR';
}
