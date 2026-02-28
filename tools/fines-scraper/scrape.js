#!/usr/bin/env node
/**
 * Скрапер за локации от https://finescharging.com/locations
 * Прихваща всички JSON отговори, търси масиви с координати, и/или извлича маркери от Leaflet картата.
 * Изход: JSON масив на stdout (един ред).
 */

import { chromium } from 'playwright';

const URL = 'https://finescharging.com/locations';
const TIMEOUT_MS = 25000;
const WAIT_AFTER_LOAD_MS = 8000;
const POPUP_READ_DELAY_MS = 280;
const CLICK_BETWEEN_MARKERS_MS = 180;
const ENRICH_PROGRESS_EVERY = 25;
const ENRICH_POINT_TIMEOUT_MS = 8000;
const DEBUG = process.env.DEBUG === '1' || process.argv.includes('--debug');

function hasCoords(obj) {
  if (!obj || typeof obj !== 'object') return false;
  const lat = obj.latitude ?? obj.lat ?? obj.y ?? obj.geometry?.coordinates?.[1];
  const lng = obj.longitude ?? obj.lng ?? obj.x ?? obj.geometry?.coordinates?.[0];
  return lat != null && lng != null && !Number.isNaN(Number(lat)) && !Number.isNaN(Number(lng));
}

function extractArray(body) {
  if (!body || typeof body !== 'object') return null;
  if (Array.isArray(body)) return body;
  const keys = ['data', 'locations', 'stations', 'chargers', 'points', 'features', 'pois', 'results', 'items'];
  for (const k of keys) {
    if (Array.isArray(body[k]) && body[k].length > 0) return body[k];
  }
  return null;
}

function isLikelyLocationsJson(body) {
  const arr = extractArray(body);
  if (!arr || arr.length === 0) return false;
  const withCoords = arr.filter((item) => hasCoords(item));
  return withCoords.length > 0 || arr.some((item) => item && typeof item === 'object' && ('name' in item || 'address' in item || 'title' in item));
}

function parsePopupText(raw) {
  if (!raw || typeof raw !== 'string') return { name: 'Fines Charging', address: '', city: '', maxPowerKw: null, connectors: [] };
  const parsed = parsePopupTextWithStations(raw);
  return {
    name: parsed.name,
    address: parsed.address,
    city: parsed.city,
    maxPowerKw: parsed.maxPowerKw,
    connectors: parsed.connectors || [],
  };
}

/**
 * Парсва попъпа от Fines: име на локация, адрес, град, maxPowerKw и списък с конектори по станции.
 * Очакван формат: "Станция Hypercharger" следвано от редове "CCS конектор с максимална мощност 300kW и цена 0.39 EUR / kWh."
 */
function parsePopupTextWithStations(raw) {
  const result = {
    name: 'Fines Charging',
    address: '',
    city: '',
    maxPowerKw: null,
    connectors: [],
  };
  if (!raw || typeof raw !== 'string') return result;

  const lines = raw
    .trim()
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const addrLabels = /^(адрес|address|ул\.|бул\.|булевард|улица|гр\.|град|city|town)/i;
  const stationHeading = /^Станция\s+(.+)$/i;
  const connectorLine = /^(.+?)\s+конектор\s+с\s+максимална\s+мощност\s+(\d+)\s*kW?\s*(?:и\s+цена\s+([^.]+))?/i;

  let currentStationName = null;
  let maxPowerKw = null;

  if (lines.length >= 1) {
    const firstLine = lines[0].replace(/\s*·\s*\d+\s*kW\s*$/i, '').trim();
    result.name = firstLine || result.name;
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const stationMatch = line.match(stationHeading);
    if (stationMatch) {
      currentStationName = stationMatch[1].trim();
      continue;
    }
    const connMatch = line.match(connectorLine);
    if (connMatch) {
      const powerKw = parseInt(connMatch[2], 10);
      if (!Number.isNaN(powerKw)) {
        if (maxPowerKw == null || powerKw > maxPowerKw) maxPowerKw = powerKw;
      }
      continue;
    }
    if (addrLabels.test(line)) {
      const rest = line.replace(addrLabels, '').replace(/^[:\s]+/, '').trim();
      if (/^(адрес|address)/i.test(line)) result.address = rest || lines[i + 1] || result.address;
      if (/^(град|city|town|гр\.)/i.test(line)) result.city = rest || lines[i + 1] || result.city;
    } else if (!result.address && line.length > 3 && !line.startsWith('На локацията') && !/^Как да стигна/i.test(line)) {
      result.address = line;
    }
  }

  const powerMatch = raw.match(/(\d+)\s*(?:kW|кВт)/i) || raw.match(/мощност[^\d]*(\d+)/i);
  if (powerMatch) result.maxPowerKw = parseInt(powerMatch[1], 10);
  if (maxPowerKw != null) result.maxPowerKw = result.maxPowerKw != null ? Math.max(result.maxPowerKw, maxPowerKw) : maxPowerKw;

  // Източник на брой конектори: глобален regex по целия текст (улавя всички повторения, дори на един ред)
  const connectorGlobal = /(.+?)\s+конектор\s+с\s+максимална\s+мощност\s+(\d+)\s*kW?\s*(?:и\s+цена\s+([^.]+?))?(?:\.|$)/gi;
  const globalMatches = [...raw.matchAll(connectorGlobal)];
  result.connectors = globalMatches.map((g) => {
    const type = (g[1] || '').trim() || 'CCS';
    const powerKw = parseInt(g[2], 10);
    const usageCost = (g[3] || '').trim() || '0.39 EUR / kWh';
    return {
      type: Number.isNaN(powerKw) ? 'CCS' : type,
      powerKw: Number.isNaN(powerKw) ? (maxPowerKw || 0) : powerKw,
      usageCost,
      stationName: currentStationName || undefined,
    };
  }).filter((c) => !Number.isNaN(c.powerKw) && c.powerKw > 0);

  return result;
}

function normalizeLocations(raw) {
  const arr = extractArray(raw);
  const list = Array.isArray(arr) ? arr : [];
  const listFromFeatures =
    (raw?.type === 'FeatureCollection' || raw?.type === 'array') && Array.isArray(raw.features) && raw.features.length > 0
      ? raw.features
      : Array.isArray(raw?.data) && raw.data.length > 0
        ? raw.data
        : null;
  const listToUse = listFromFeatures || list;
  return listToUse
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const p = item.properties || item;
      const latlng = p.latlng ?? item.latlng;
      let lat =
        item.latitude ?? item.lat ?? p.latitude ?? p.lat ?? item.y ??
        (Array.isArray(latlng) ? latlng[0] : latlng?.lat) ??
        item.geometry?.coordinates?.[1];
      let lng =
        item.longitude ?? item.lng ?? p.longitude ?? p.lng ?? item.x ??
        (Array.isArray(latlng) ? latlng[1] : latlng?.lng) ??
        item.geometry?.coordinates?.[0];
      // Fines API може да връща latlng като [lng, lat] (GeoJSON). БГ: lat 41–44, lng 22–28.
      if (Array.isArray(latlng) && latlng.length >= 2 && lat != null && lng != null) {
        const a = Number(latlng[0]);
        const b = Number(latlng[1]);
        if (a >= 21 && a <= 30 && b >= 40 && b <= 46) {
          lat = b;
          lng = a;
        }
      }
      if (lat == null || lng == null) return null;
      const name = item.name ?? p.name ?? item.title ?? p.title ?? p.Title ?? p.AddressInfo?.Title ?? p.address?.title ?? '';
      const geocodeText = p.geocode_text ?? item.geocode_text ?? '';
      const address =
        geocodeText ||
        (item.address ??
        p.address ??
        p.Address ??
        p.AddressLine1 ??
        p.addressLine1 ??
        p.street ??
        p.street_address ??
        p.formatted_address ??
        p.full_address ??
        p.location_address ??
        p['addr:street'] ??
        p['addr:full'] ??
        p.location ??
        p.place_address ??
        (p['addr:housenumber'] && p['addr:street'] ? `${p['addr:street']} ${p['addr:housenumber']}` : p['addr:housenumber'] || p['addr:street']) ??
        p.description ??
        (typeof p.address === 'object' && p.address?.formatted ? p.address.formatted : null) ??
        (typeof p.address === 'object' && p.address?.street ? p.address.street : null) ??
        '');
      let city =
        item.city ??
        p.city ??
        p.town ??
        p.Town ??
        p['addr:city'] ??
        p.locality ??
        p.municipality ??
        p['addr:place'] ??
        p.place ??
        p.place_name ??
        p.settlement ??
        p.region ??
        p.AddressInfo?.Town ??
        p.address?.city ??
        (typeof p.address === 'object' && p.address?.city ? p.address.city : null) ??
        '';
      if (!city && geocodeText) {
        const parts = geocodeText.split(',').map((s) => s.trim()).filter(Boolean);
        if (parts.length >= 2) city = parts[1].replace(/\s*\d{4}\s*$/, '').trim() || parts[1];
      }
      const country = item.country ?? p.country ?? p['addr:country'] ?? p.AddressInfo?.Country?.ISOCode ?? p.address?.country ?? 'BG';
      const power = item.maxPower ?? item.power ?? p.maxPower ?? p.power ?? p.MaxPowerKw ?? p.Connections?.[0]?.PowerKW;
      let nameStr = String(name || 'Fines Charging').trim();
      nameStr = nameStr.replace(/^FINES\s+/i, '');
      if (!nameStr) nameStr = 'Fines Charging';
      return {
        name: nameStr,
        address: String(address || '').trim(),
        city: String(city || '').trim(),
        country: String(country || 'BG').trim(),
        latitude: Number(lat),
        longitude: Number(lng),
        maxPowerKw: power != null ? Number(power) : null,
      };
    })
    .filter(Boolean);
}

let captured = [];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
    locale: 'bg-BG',
  });
  const page = await context.newPage();

  page.on('response', async (response) => {
    try {
      const url = response.url();
      const ct = (response.headers()['content-type'] || '').toLowerCase();
      if (!ct.includes('json') && !url.includes('api') && !url.includes('location') && !url.includes('charger')) return;
      const body = await response.json().catch(() => null);
      if (!body) return;
      if (DEBUG) {
        process.stderr.write(`[DEBUG] JSON ${url}\n`);
        if (url.includes('locations-geojson') && body) {
          const topKeys = typeof body === 'object' && body !== null ? Object.keys(body) : [];
          process.stderr.write(`[DEBUG] locations-geojson top keys: ${topKeys.join(', ')}\n`);
          const arr = extractArray(body);
          const first = arr && arr.length > 0 ? arr[0] : null;
          if (first) {
            const props = first.properties || first;
            const keys = Object.keys(props);
            process.stderr.write(`[DEBUG] first item keys: ${keys.join(', ')}\n`);
            keys.forEach((k) => {
              const v = props[k];
              if (v != null && typeof v === 'string' && v.length < 120) process.stderr.write(`[DEBUG]   ${k}= ${JSON.stringify(v)}\n`);
            });
          }
        }
      }
      if (isLikelyLocationsJson(body) || body?.type === 'FeatureCollection') {
        const normalized = normalizeLocations(body);
        const hasRich = normalized.some((s) => (s.name && s.name !== 'Fines Charging') || (s.address && s.address.trim()) || (s.city && s.city.trim()));
        const currentRich = captured.some((s) => (s.name && s.name !== 'Fines Charging') || (s.address && s.address.trim()) || (s.city && s.city.trim()));
        if (normalized.length > captured.length) captured = normalized;
        else if (normalized.length > 0 && hasRich && !currentRich) captured = normalized;
      }
      const arr = extractArray(body);
      if (arr && arr.length > 0 && arr.some(hasCoords)) {
        const normalized = normalizeLocations(body);
        const hasRich = normalized.some((s) => (s.name && s.name !== 'Fines Charging') || (s.address && s.address.trim()) || (s.city && s.city.trim()));
        const currentRich = captured.some((s) => (s.name && s.name !== 'Fines Charging') || (s.address && s.address.trim()) || (s.city && s.city.trim()));
        if (normalized.length > captured.length) captured = normalized;
        else if (normalized.length > 0 && hasRich && !currentRich) captured = normalized;
      }
    } catch (_) {}
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS }).catch(() => {});

  await page.waitForTimeout(WAIT_AFTER_LOAD_MS);

  if (captured.length === 0) {
    const fromDom = await page.evaluate(() => {
      const parsePopup = (lat, lng, popupContent) => {
        if (!popupContent || typeof popupContent !== 'string') return { name: 'Fines Charging', address: '', city: '', maxPowerKw: null };
        const div = document.createElement('div');
        div.innerHTML = popupContent;
        const raw = (div.innerText || div.textContent || '').trim();
        const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean);
        let name = 'Fines Charging';
        let address = '';
        let city = '';
        let maxPowerKw = null;
        const addrLabels = /^(адрес|address|ул\.|бул\.|булевард|улица|гр\.|град|city|town)/i;
        const powerMatch = raw.match(/(\d+)\s*(?:kW|кВт)/i) || raw.match(/мощност[^\d]*(\d+)/i);
        if (powerMatch) maxPowerKw = parseInt(powerMatch[1], 10);
        if (lines.length >= 1) name = lines[0];
        if (lines.length >= 2 && !addrLabels.test(lines[1])) address = lines[1];
        for (let i = 1; i < lines.length; i++) {
          if (addrLabels.test(lines[i])) {
            const rest = lines[i].replace(addrLabels, '').replace(/^[:\s]+/, '').trim();
            if (/^(адрес|address)/i.test(lines[i])) address = rest || lines[i + 1] || address;
            if (/^(град|city|town|гр\.)/i.test(lines[i])) city = rest || lines[i + 1] || city;
          } else if (!address && lines[i].length > 3) address = lines[i];
        }
        return { name, address, city, maxPowerKw };
      };

      const out = [];

      const byDataAttrs = document.querySelectorAll('[data-lat][data-lng], [data-latitude][data-longitude]');
      byDataAttrs.forEach((el) => {
        const lat = parseFloat(el.getAttribute('data-lat') ?? el.getAttribute('data-latitude') ?? el.dataset?.lat ?? el.dataset?.latitude);
        const lng = parseFloat(el.getAttribute('data-lng') ?? el.getAttribute('data-longitude') ?? el.dataset?.lng ?? el.dataset?.longitude);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          const name = el.getAttribute('title') ?? el.getAttribute('aria-label') ?? el.dataset?.title ?? '';
          out.push({ latitude: lat, longitude: lng, name: name || 'Fines Charging', address: '', city: '', country: 'BG', maxPowerKw: null });
        }
      });
      if (out.length > 0) return out;

      const markers = document.querySelectorAll('.leaflet-marker-icon, [class*="marker"]');
      markers.forEach((el) => {
        const style = el.getAttribute('style') || '';
        const transform = style.match(/transform:\s*translate3d\(([^,]+)px,\s*([^,]+)px/);
        if (transform) {
          const left = parseFloat(transform[1]);
          const top = parseFloat(transform[2]);
          const parent = el.closest('.leaflet-map-pane')?.parentElement;
          if (parent && typeof parent._leaflet_lat_lng !== 'undefined') {
            const ll = parent._leaflet_lat_lng;
            if (ll) out.push({ latitude: ll.lat, longitude: ll.lng, name: 'Fines Charging', address: '', city: '', country: 'BG', maxPowerKw: null });
          }
        }
        const lat = el.getAttribute('data-lat') ?? el.dataset?.lat;
        const lng = el.getAttribute('data-lng') ?? el.dataset?.lng;
        if (lat != null && lng != null) {
          out.push({ latitude: parseFloat(lat), longitude: parseFloat(lng), name: 'Fines Charging', address: '', city: '', country: 'BG', maxPowerKw: null });
        }
      });

      if (out.length > 0) return out;

      const getPopupContent = (layer) => {
        try {
          if (layer.getPopup && typeof layer.getPopup === 'function') {
            const popup = layer.getPopup();
            if (popup && (popup.getContent && typeof popup.getContent === 'function')) return popup.getContent();
            if (popup && popup._content) return typeof popup._content === 'string' ? popup._content : (popup._content?.innerHTML ?? '');
          }
          if (layer._popup && layer._popup._content) {
            const c = layer._popup._content;
            return typeof c === 'string' ? c : (c?.innerHTML ?? '');
          }
        } catch (_) {}
        return null;
      };

      const pushLayer = (layer) => {
        if (!layer._latlng) return;
        const content = getPopupContent(layer);
        const opts = layer.options?.title ?? layer.options?.alt ?? layer?.feature?.properties?.name;
        let name = opts ?? 'Fines Charging';
        let address = '';
        let city = '';
        let maxPowerKw = null;
        if (content) {
          const parsed = parsePopup(layer._latlng.lat, layer._latlng.lng, content);
          if (parsed.name && parsed.name !== 'Fines Charging') name = parsed.name;
          address = parsed.address || address;
          city = parsed.city || city;
          maxPowerKw = parsed.maxPowerKw;
        }
        out.push({
          latitude: layer._latlng.lat,
          longitude: layer._latlng.lng,
          name,
          address,
          city,
          country: 'BG',
          maxPowerKw,
        });
      };

      const mapCandidates = [window.map, window.leafletMap, window.maps, window.__map, window.app?.map, window.$map];
      for (const map of mapCandidates) {
        if (map && map._layers && typeof map._layers === 'object') {
          for (const layer of Object.values(map._layers)) {
            pushLayer(layer);
          }
          if (out.length > 0) return out;
        }
      }

      for (const key of Object.keys(window)) {
        if (/map|leaflet|marker|location|charger/i.test(key)) {
          try {
            const val = window[key];
            if (val && typeof val === 'object' && val._layers) {
              const layers = Object.values(val._layers);
              for (const layer of layers) {
                pushLayer(layer);
              }
              if (out.length > 0) return out;
            }
            if (Array.isArray(val) && val.length > 0 && val.some((i) => i && (i.lat ?? i.latitude) != null)) {
              for (const i of val) {
                const lat = i.lat ?? i.latitude;
                const lng = i.lng ?? i.longitude;
                if (lat != null && lng != null) out.push({ latitude: Number(lat), longitude: Number(lng), name: i.name ?? i.title ?? 'Fines Charging', address: i.address ?? '', city: i.city ?? '', country: i.country ?? 'BG', maxPowerKw: i.maxPowerKw ?? i.maxPower ?? i.power ?? null });
              }
              if (out.length > 0) return out;
            }
          } catch (_) {}
        }
      }

      const scripts = document.querySelectorAll('script:not([src])');
      for (const s of scripts) {
        const t = s.textContent || '';
        const patterns = [
          /(?:locations?|stations?|chargers?|points?|data)\s*[=:]\s*(\[[\s\S]*?\])\s*[;,)]/,
          /(?:locations?|stations?|chargers?)\s*[=:]\s*(\{[\s\S]*?"(?:lat|latitude|coordinates)"[\s\S]*?\})\s*[;,)]/,
        ];
        for (const re of patterns) {
          const m = t.match(re);
          if (m) {
            try {
              const parsed = JSON.parse(m[1]);
              const arr = Array.isArray(parsed) ? parsed : (parsed?.data ?? parsed?.locations ?? []);
              if (Array.isArray(arr) && arr.length > 0) {
                for (const i of arr) {
                  const lat = i?.lat ?? i?.latitude ?? i?.geometry?.coordinates?.[1];
                  const lng = i?.lng ?? i?.longitude ?? i?.geometry?.coordinates?.[0];
                  if (lat != null && lng != null) out.push({ latitude: Number(lat), longitude: Number(lng), name: i?.name ?? i?.title ?? 'Fines Charging', address: i?.address ?? '', city: i?.city ?? '', country: i?.country ?? 'BG', maxPowerKw: i?.maxPowerKw ?? i?.maxPower ?? i?.power ?? null });
                }
                if (out.length > 0) return out;
              }
            } catch (_) {}
          }
        }
      }
      return out;
    }).catch(() => []);

    if (fromDom.length > 0) captured = fromDom;
  }

  if (captured.length > 0) {
    let positions = [];
    for (const attempt of [0, 1]) {
      if (attempt > 0) {
        process.stderr.write(`[DEBUG] Retrying marker layers in 3s...\n`);
        await page.waitForTimeout(3000);
      }
      positions = await page
        .evaluate(() => {
          const findMarkerLayers = (map) => {
            if (!map || !map._layers || typeof map._layers !== 'object') return null;
            const markerLayers = Object.values(map._layers).filter((l) => l && l._latlng && l._icon && typeof l.openPopup === 'function');
            return markerLayers.length > 0 ? markerLayers : null;
          };
          const mapCandidates = [window.map, window.leafletMap, window.maps, window.__map, window.app?.map, window.$map];
          for (const map of mapCandidates) {
            const markerLayers = findMarkerLayers(map);
            if (markerLayers) {
              window.__finesMarkerLayers = markerLayers;
              return markerLayers.map((l) => ({ lat: l._latlng.lat, lng: l._latlng.lng }));
            }
          }
          for (const key of Object.keys(window)) {
            if (!/map|leaflet/i.test(key)) continue;
            try {
              const val = window[key];
              if (val && typeof val === 'object' && val._layers) {
                const markerLayers = findMarkerLayers(val);
                if (markerLayers) {
                  window.__finesMarkerLayers = markerLayers;
                  return markerLayers.map((l) => ({ lat: l._latlng.lat, lng: l._latlng.lng }));
                }
              }
            } catch (_) {}
          }
          return [];
        })
        .catch(() => []);
      if (positions.length > 0) break;
    }

    const positionsToUse = positions.length > 0 ? positions : [];
    if (positions.length === 0 && captured.length > 0 && DEBUG) {
      process.stderr.write(`[DEBUG] No marker layers from map – skipping popup enrichment (output has no connectors). Run again or check map.\n`);
    }
    if (positionsToUse.length > 0 && DEBUG) process.stderr.write(`[DEBUG] Enriching ${positionsToUse.length} points (connectors from popup)\n`);

    const closeAnyPopup = async () => {
      await page.evaluate(() => {
        const p = document.querySelector('.leaflet-popup .leaflet-popup-close-button');
        if (p) p.click();
      }).catch(() => {});
    };

    if (positionsToUse.length > 0) {
      const total = Math.min(positionsToUse.length, 500);
      for (let i = 0; i < total; i++) {
        const lat = positionsToUse[i].lat;
        const lng = positionsToUse[i].lng;
        const step = async () => {
          await closeAnyPopup();
          await page.waitForTimeout(100);
          if (positions.length > 0) {
            await page.evaluate((idx) => {
              if (window.__finesMarkerLayers && window.__finesMarkerLayers[idx]) window.__finesMarkerLayers[idx].openPopup();
            }, i);
          } else {
            await page.evaluate(({ lat, lng }) => {
              const tol = 0.0003;
              const cand = [window.map, window.leafletMap, window.maps, window.__map, window.app?.map, window.$map];
              for (const map of cand) {
                if (!map || !map._layers || typeof map._layers !== 'object') continue;
                for (const layer of Object.values(map._layers)) {
                  if (layer && layer._latlng && typeof layer.openPopup === 'function') {
                    const L = layer._latlng;
                    if (Math.abs(L.lat - lat) < tol && Math.abs(L.lng - lng) < tol) {
                      layer.openPopup();
                      return;
                    }
                  }
                }
              }
            }, { lat, lng });
          }
          await page.waitForSelector('.leaflet-popup-content', { state: 'visible', timeout: 2000 }).catch(() => {});
          await page.waitForTimeout(POPUP_READ_DELAY_MS);
          const text = await page
            .evaluate(() => {
              const el = document.querySelector('.leaflet-popup-content');
              return el ? (el.innerText || el.textContent || '').trim() : '';
            })
            .catch(() => '');
          const connectorTypesFromDom = await page
            .evaluate(() => {
              const wrap = document.querySelector('.leaflet-popup-content .location_popup_connectors');
              if (!wrap) return [];
              const imgs = wrap.querySelectorAll('img[src]');
              return Array.from(imgs).map((img) => {
                const s = (img.getAttribute('src') || '').toLowerCase();
                if (s.includes('type2') || s.includes('type-2')) return 'Type 2';
                if (s.includes('chademo')) return 'CHAdeMO';
                return 'CCS';
              });
            })
            .catch(() => []);
          await closeAnyPopup();
          const parsed = parsePopupText(text);
          const { name, address, city, maxPowerKw } = parsed;
          const powerKw = parsed.maxPowerKw != null ? parsed.maxPowerKw : 120;
          const usageCost = '0.39 EUR / kWh';
          const connectors =
            connectorTypesFromDom.length > 0
              ? connectorTypesFromDom.map((type) => ({ type, powerKw, usageCost }))
              : parsed.connectors;
          const tolerance = 0.0002;
          let match = captured.find(
            (s) => Math.abs((s.latitude ?? s.lat) - lat) < tolerance && Math.abs((s.longitude ?? s.lng) - lng) < tolerance
          );
          if (!match && captured.length > 0) {
            const dist = (s) => Math.hypot((s.latitude ?? s.lat) - lat, (s.longitude ?? s.lng) - lng);
            const closest = captured.reduce((a, b) => (dist(a) < dist(b) ? a : b));
            if (dist(closest) < 0.001) match = closest;
          }
          if (match) {
            if (Array.isArray(connectors) && connectors.length > 0) match.connectors = connectors;
            if (name && name !== 'Fines Charging') match.name = name;
            if (address && address.trim()) match.address = address.trim();
            if (city && city.trim()) match.city = city.trim();
            if (maxPowerKw != null) match.maxPowerKw = maxPowerKw;
          } else if (positions.length > 0) {
            captured.push({
              latitude: lat,
              longitude: lng,
              name: name || 'Fines Charging',
              address: address || '',
              city: city || '',
              country: 'BG',
              maxPowerKw: maxPowerKw != null ? maxPowerKw : null,
              connectors: Array.isArray(connectors) && connectors.length > 0 ? connectors : undefined,
            });
          }
        };
        try {
          await Promise.race([
            step(),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ENRICH_POINT_TIMEOUT_MS)),
          ]);
        } catch (e) {
          await closeAnyPopup().catch(() => {});
          if (DEBUG && e?.message === 'timeout') process.stderr.write(`[DEBUG] Timeout point ${i + 1}/${total}\n`);
        }
        if ((i + 1) % ENRICH_PROGRESS_EVERY === 0 || i === 0) {
          process.stderr.write(`Enriched ${i + 1}/${total} points\n`);
        }
        await page.waitForTimeout(CLICK_BETWEEN_MARKERS_MS);
      }
    }
  }

  await browser.close();

  console.log(JSON.stringify(captured));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
