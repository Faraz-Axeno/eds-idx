// Dealer Locator data: options and dealer lists from the dealer APIs.

import {
  callDealerApi, clean, directionsTo, keyOf, toPoint, toStreet,
} from '../../scripts/utils/dealer-api.js';

export { clean, keyOf };

/** One API dealer as a card's dealer, or null without a name. */
function toDealer(record, index) {
  if (!record) return null;
  const name = clean(record.dealerName);
  if (!name) return null;
  const city = clean(record.city);
  const state = clean(record.state);
  const pin = clean(record.postalCode);
  return {
    id: clean(record.dealerCodeSalesUnit) || `dealer-${index}`,
    name,
    type: clean(record.dealerType),
    street: toStreet(record.address, { city, state, pin }),
    point: toPoint(record.latitude, record.longitude),
    state,
    city,
    pin,
  };
}

const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

/** The API's dealers with address line and directions, sorted by state, city, name. */
export function toDealers(records) {
  const dealers = (Array.isArray(records) ? records : []).map(toDealer).filter(Boolean);
  dealers.forEach((dealer) => {
    const place = [dealer.city, dealer.state].filter(Boolean).join(', ');
    dealer.area = [place, dealer.pin].filter(Boolean).join(' – ');
    dealer.directions = directionsTo(dealer.point, [dealer.street, dealer.area].filter(Boolean).join(', '));
  });
  return dealers.sort((a, b) => collator.compare(a.state, b.state)
    || collator.compare(a.city, b.city)
    || collator.compare(a.name, b.name));
}

/** API values as sorted, de-duplicated dropdown options (value kept in the API's spelling). */
export function toOptions(values) {
  const byKey = new Map();
  (Array.isArray(values) ? values : []).forEach((raw) => {
    const value = clean(raw);
    if (value && !byKey.has(keyOf(value))) byKey.set(keyOf(value), value);
  });
  return [...byKey.values()].map((value) => ({ value, label: value }))
    .sort((a, b) => collator.compare(a.label, b.label));
}

/** States with dealers. */
export async function getStates(options) {
  return toOptions((await callDealerApi('/states', {}, options)).states);
}

/** Cities with dealers in a state. */
export async function getCities(state, options) {
  return state ? toOptions((await callDealerApi('/cities', { state }, options)).cities) : [];
}

/** Pincodes with dealers in a state and city. */
export async function getPincodes(state, city, options) {
  return state && city ? toOptions((await callDealerApi('/pincode', { state, city }, options)).pincodes) : [];
}

/** Dealers matching a search (all when empty). */
export async function getDealers({ state = '', city = '', pincode = '' } = {}, options = {}) {
  return toDealers((await callDealerApi('', { state, city, pincode }, options)).dealers);
}
