import { Logger } from "@vendure/core";
export function sanitizeStreetLine1(value?: string): string {
  if (!value) return "";
  let s = String(value).trim();
  // Remove the standalone word 'Area' (case-insensitive) and any following separators
  s = s.replace(/\barea\b[:\s-]*/gi, "");
  // Remove obvious test tokens
  s = s.replace(/\btest\b/gi, "");
  // Collapse multiple spaces and trim
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export async function computeNearestBranch(
  shippingAddress: {
    streetLine1?: string;
    streetLine2?: string;
    city?: string;
    province?: string;
  } | undefined,
  getBranches: () => Promise<any[] | null>,
  geocodeAddress: (address: string) => Promise<{ lat: number; lon: number } | null>,
  haversineDistance: (coords1: { lat: number; lng: number }, coords2: { lat: number; lng: number }) => number
): Promise<string | null> {
  if (!shippingAddress) return null;
  const addressParts = [
    shippingAddress.streetLine1,
    shippingAddress.streetLine2,
    shippingAddress.city,
    shippingAddress.province,
  ];
  // Sanitize streetLine1 to remove noise like 'Area' or 'test'
  if (addressParts[0]) {
    addressParts[0] = sanitizeStreetLine1(addressParts[0]);
  }
  const address = addressParts.filter((part) => !!part).join(", ");
  const branches = await getBranches();
  if (!branches || !Array.isArray(branches) || branches.length === 0) {
    Logger.warn(
      `[NCM] No branches loaded for address: ${address}`,
      "ncm-branch-match"
    );
    return null;
  }
  const coords = address ? await geocodeAddress(address) : null;
  if (!coords) {
    Logger.warn(
      `[NCM] Geocoding failed for address: ${address}`,
      "ncm-branch-match"
    );
    return null;
  }
  let nearestBranch = null;
  let minDistance = Infinity;
  for (const branch of branches) {
    if (branch?.coordinates?.lat != null && branch?.coordinates?.lng != null) {
      const distance = haversineDistance(
        { lat: coords.lat, lng: coords.lon },
        { lat: branch.coordinates.lat, lng: branch.coordinates.lng }
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestBranch = branch;
      }
    }
  }
  if (!nearestBranch) {
    Logger.warn(
      `[NCM] No nearest branch found for address: ${address} (coords: ${JSON.stringify(coords)})`,
      "ncm-branch-match"
    );
  }
  return nearestBranch?.name || null;
}