import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveBinding, normalizeAddress } from '../src/ble/noble.js';

test('resolveBinding: platform szerinti alapértelmezés', () => {
  assert.equal(resolveBinding({ platform: 'linux', env: {} }), 'dbus');
  assert.equal(resolveBinding({ platform: 'win32', env: {} }), 'win');
  assert.equal(resolveBinding({ platform: 'darwin', env: {} }), 'mac');
});

test('resolveBinding: auto/default = platform szerint', () => {
  assert.equal(resolveBinding({ platform: 'win32', binding: 'auto', env: {} }), 'win');
  assert.equal(resolveBinding({ platform: 'linux', env: { CODIE_BLE_BINDING: 'default' } }), 'dbus');
});

test('resolveBinding: explicit felülírás (paraméter > CODIE_BLE_BINDING > NOBLE_BINDINGS)', () => {
  assert.equal(resolveBinding({ platform: 'linux', binding: 'HCI', env: {} }), 'hci');
  assert.equal(resolveBinding({ platform: 'linux', env: { CODIE_BLE_BINDING: 'hci' } }), 'hci');
  assert.equal(resolveBinding({ platform: 'win32', env: { NOBLE_BINDINGS: 'win' } }), 'win');
  assert.equal(
    resolveBinding({ platform: 'linux', binding: 'dbus', env: { CODIE_BLE_BINDING: 'hci' } }),
    'dbus',
  );
});

test('resolveBinding: ismeretlen binding / platform hibát dob', () => {
  assert.throws(() => resolveBinding({ platform: 'linux', binding: 'bluez', env: {} }), /Ismeretlen BLE binding/);
  assert.throws(() => resolveBinding({ platform: 'aix', env: {} }), /nincs támogatott BLE binding/);
});

test('normalizeAddress: a Windows-os (kisbetűs) cím is egységes formára jön', () => {
  assert.equal(normalizeAddress('00:07:80:66:f0:db'), '00:07:80:66:F0:DB');
  assert.equal(normalizeAddress('00078066f0db'), '00:07:80:66:F0:DB');
});
