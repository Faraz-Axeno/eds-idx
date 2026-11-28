/*
 * Reserve Status: the payment status page (/reserve/status), placed once. The payment
 * returns there with ?payment=success|pending|error&txnid=…; the block asks the payment API
 * about the transaction and shows the screen of the confirmed status (Reserved, Payment
 * pending or Payment failed), whatever ?payment= says. It is the Reserve Flow's status screens
 * on their own: the rows are handed to reserve-flow.js in that block's shape, and
 * reserve-status.css brings in its styles.
 * Rows, in model order: car image | price label | price | price note | mobile price label |
 * Payment pending | Payment failed | Reserved | Reserved background | Reserved car image.
 */

import decorateFlow from '../reserve-flow/reserve-flow.js';

const FIELDS = [
  'image', 'priceLabel', 'price', 'priceNote', 'priceMobile',
  'pending', 'failed', 'reserved', 'reservedBackground', 'reservedCar',
];

const div = (...children) => {
  const node = document.createElement('div');
  node.append(...children);
  return node;
};

/**
 * @param {Element} block
 */
export default function decorate(block) {
  const rows = [...block.children];
  const cells = Object.fromEntries(FIELDS.map((name, i) => [
    name, rows[i]?.querySelector(':scope > div') || div(),
  ]));
  // the Reserve Flow's rows: the four price rows, then its keyed content rows
  block.replaceChildren(
    div(cells.image),
    div(cells.priceLabel),
    div(cells.price),
    div(cells.priceNote),
    div(div('price-mobile'), cells.priceMobile),
    div(div('pending'), cells.pending),
    div(div('failed'), cells.failed),
    div(div('reserved'), cells.reserved, cells.reservedBackground),
    div(div('reserved-car'), div(), cells.reservedCar),
  );
  block.classList.add('reserve-flow', 'status');
  decorateFlow(block);
}
