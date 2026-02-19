#!/usr/bin/env node
/**
 * Скрапер за локации от https://finescharging.com/locations
 * Зарежда страницата с Playwright, прихваща мрежови заявки и извлича JSON с станции,
 * или извлича маркери от картата в DOM.
 * Изход: JSON масив на stdout (един ред).
 */

import { chromium } from 'playwright';

const URL = 'https://finescharging.com/locations';
const TIMEOUT_MS = 20000;

function isLikelyLocationsJson(body) {
  if (!body || typeof body !== 'object') return false;
  const arr = Array.isArray(body) ? body : (body.data || body.locations || body.features || body.pois);
  if (!Array.isArray(arr) || arr.length === 0) return false;
  const first = arr[0];
  if (!first || typeof first !== 'object') return false;
  const hasCoords = ('latitude' in first || 'lat' in first) && ('longitude' in first || 'lng' in first);
  const hasNameOrAddress = 'name' in first || 'title' in first || 'address' in first || 'addressLine1' in first;
  return hasCoords || hasNameOrAddress;
}

function normalizeLocations(raw) {
  const arr = Array.isArray(raw) ? raw : (raw?.data || raw?.locations || raw?.features || []);
  return arr.map((item) => {
    const lat = item.latitude ?? item.lat ?? item.y ?? item.geometry?.coordinates?.[1];
    const lng = item.longitude ?? item.lng ?? item.x ?? item.geometry?.coordinates?.[0];
    const name = item.name ?? item.title ?? item.AddressInfo?.Title ?? item.address?.title ?? '';
    const address = item.address ?? item.AddressInfo?.AddressLine1 ?? item.addressLine1 ?? item.street ?? '';
    const city = item.city ?? item.town ?? item.AddressInfo?.Town ?? item.address?.city ?? '';
    const country = item.country ?? item.AddressInfo?.Country?.ISOCode ?? item.address?.country ?? 'BG';
    const power = item.maxPower ?? item.power ?? item.MaxPowerKw ?? item.Connections?.[0]?.PowerKW;
    const connectors = item.connectors ?? item.Connections ?? item.connectionTypes;
    return {
      name: String(name || 'Fines Charging').trim(),
      address: String(address || '').trim(),
      city: String(city || '').trim(),
      country: String(country || 'BG').trim(),
      latitude: lat != null ? Number(lat) : null,
      longitude: lng != null ? Number(lng) : null,
      maxPowerKw: power != null ? Number(power) : null,
      connectors: connectors,
      raw: item,
    };
  }).filter((s) => (s.latitude != null && s.longitude != null) || s.name || s.address);
}

let captured = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  page.on('response', async (response) => {
    try {
      const u = response.url();
      const ct = response.headers()['content-type'] || '';
      if (!ct.includes('json')) return;
      const body = await response.json().catch(() => null);
      if (body && isLikelyLocationsJson(body)) {
        const normalized = normalizeLocations(body);
        if (normalized.length > 0) {
          captured = normalized;
        }
      }
    } catch (_) {}
  });

  await page.goto(URL, { waitUntil: 'networkidle', timeout: TIMEOUT_MS }).catch(() => {});

  if (captured.length === 0) {
    await page.waitForTimeout(5000);
    const fromDom = await page.evaluate(() => {
      const markers = document.querySelectorAll('[class*="marker"], [class*="Marker"], .leaflet-marker-icon, [data-lat], [data-lng]');
      const out = [];
      markers.forEach((el) => {
        const lat = el.getAttribute('data-lat') ?? el.dataset?.lat;
        const lng = el.getAttribute('data-lng') ?? el.dataset?.lng;
        if (lat != null && lng != null) {
          const title = el.getAttribute('title') ?? el.getAttribute('aria-label') ?? '';
          out.push({ latitude: parseFloat(lat), longitude: parseFloat(lng), name: title || 'Fines' });
        }
      });
      if (out.length > 0) return out;
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const t = s.textContent || '';
        const m = t.match(/locations?\s*[=:]\s*(\[[\s\S]*?\]);/);
        if (m) {
          try {
            return JSON.parse(m[1]);
          } catch (_) {}
        }
      }
      return [];
    }).catch(() => []);
    if (fromDom.length > 0) captured = normalizeLocations(fromDom);
  }

  await browser.close();

  console.log(JSON.stringify(captured));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
