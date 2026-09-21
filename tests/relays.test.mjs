import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sendFirst } from '../assets/js/relays.mjs';

const relay = (name, result, calls) => ({
  name,
  enabled: result !== 'disabled',
  send: async () => {
    calls.push(name);
    if (result === 'throw') throw new Error('network down');
    return result === true;
  }
});

test('uses the first enabled relay that confirms delivery', async () => {
  const calls = [];
  const res = await sendFirst([relay('sheet', 'disabled', calls), relay('web3forms', true, calls), relay('formsubmit', true, calls)], {});
  assert.deepEqual(res, { ok: true, via: 'web3forms' });
  assert.deepEqual(calls, ['web3forms']); // never double-sends
});

test('moves on when a relay is down or refuses', async () => {
  const calls = [];
  const res = await sendFirst([relay('web3forms', 'throw', calls), relay('formsubmit', false, calls), relay('backup', true, calls)], {});
  assert.deepEqual(res, { ok: true, via: 'backup' });
  assert.deepEqual(calls, ['web3forms', 'formsubmit', 'backup']);
});

test('reports failure when nothing confirms delivery', async () => {
  const calls = [];
  const res = await sendFirst([relay('web3forms', false, calls), relay('formsubmit', 'throw', calls)], {});
  assert.deepEqual(res, { ok: false, via: null });
});

test('passes the form data to each relay', async () => {
  let seen = null;
  await sendFirst([{ name: 'x', enabled: true, send: async (d) => { seen = d; return true; } }], { name: 'Sam' });
  assert.deepEqual(seen, { name: 'Sam' });
});
