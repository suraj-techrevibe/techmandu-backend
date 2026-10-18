import axios from "axios";
import { Logger } from "@vendure/core";

export async function geocodeAddress(address: string, cache: Map<string, { lat: number; lon: number; fetchedAt: number }>, ttlMs: number): Promise<{ lat: number; lon: number } | null> {
  if (!address) return null;
  const cached = cache.get(address);
  const now = Date.now();
  if (cached && now - cached.fetchedAt < ttlMs) {
    return { lat: cached.lat, lon: cached.lon };
  }
  try {
    let streetMapApiUrl = process.env.STREETMAP_API_URL;
    if (!streetMapApiUrl) {
      streetMapApiUrl = "https://nominatim.openstreetmap.org/";
      Logger.warn(
        `[NCM] Using fallback STREETMAP_API_URL: ${streetMapApiUrl}`,
        "ncm-geocode"
      );
    }
    const url = `${streetMapApiUrl.replace(/\/$/, "")}/search?q=${encodeURIComponent(address)}&format=json`;
    const res = await axios.get(url, { timeout: 7000, headers: { 'User-Agent': 'vendure-ncm-integration/1.0' } });
    if (Array.isArray(res.data) && res.data.length > 0) {
      const entry = { lat: parseFloat(res.data[0].lat), lon: parseFloat(res.data[0].lon), fetchedAt: now };
      cache.set(address, entry);
      return { lat: entry.lat, lon: entry.lon };
    }
  } catch (e: any) {
    Logger.error(
      `[NCM] geocode failed: ${e?.message ?? String(e)}`,
      "ncm-geocode"
    );
  }
  return null;
}
