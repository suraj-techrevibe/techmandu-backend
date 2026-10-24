export interface OrderOwnerInfo {
  customer?: { user?: { id?: string | number | null } | null } | null;
}

/**
 * Decides if the caller may act on an order. Allowed when it is the caller's
 * own active order (guest or logged in), or when it belongs to the logged-in
 * customer. Anything else, including an unknown order, is refused.
 */
export function canAccessOrder(args: {
  orderId: string | number;
  activeOrderId?: string | number | null;
  activeUserId?: string | number | null;
  order?: OrderOwnerInfo | null;
}): boolean {
  const { orderId, activeOrderId, activeUserId, order } = args;
  const id = String(orderId);
  if (activeOrderId != null && String(activeOrderId) === id) return true;
  if (activeUserId == null) return false;
  const ownerId = order?.customer?.user?.id;
  return ownerId != null && String(ownerId) === String(activeUserId);
}
