/**
 * Noble példány — a teljes backend egyetlen BLE "radio"-ja, hogy több robot
 * is kezelhető legyen egyszerre.
 *
 * A binding platformfüggő:
 *   - Linux   → `dbus`  (BlueZ D-Bus; együtt működik a `bluetoothctl`-lel, root nélkül)
 *   - Windows → `win`   (natív WinRT Bluetooth LE, Windows 10 1703+ / Windows 11)
 *   - macOS   → `mac`   (CoreBluetooth)
 *
 * Felülírható a `CODIE_BLE_BINDING` (vagy a noble-féle `NOBLE_BINDINGS`)
 * környezeti változóval: `dbus` | `hci` | `win` | `mac`.
 *
 * A noble peripheral-ID mindhárom bindingnél ugyanaz a forma (a cím kettőspont
 * nélkül, kisbetűvel: "00078066f0db"), így a kliens többi része változatlan.
 */
'use strict';
import { withBindings } from '@stoprocent/noble';

export const SUPPORTED_BINDINGS = ['dbus', 'hci', 'win', 'mac'];

const PLATFORM_DEFAULTS = {
  linux: 'dbus',
  freebsd: 'hci',
  win32: 'win',
  darwin: 'mac',
};

/**
 * Kiválasztja a használandó noble bindinget.
 *
 * @param {{platform?: string, binding?: string, env?: object}} [options]
 * @returns {string} 'dbus' | 'hci' | 'win' | 'mac'
 */
export function resolveBinding({ platform = process.platform, binding, env = process.env } = {}) {
  const requested = String(binding || env.CODIE_BLE_BINDING || env.NOBLE_BINDINGS || '')
    .trim()
    .toLowerCase();
  if (requested && requested !== 'auto' && requested !== 'default') {
    if (!SUPPORTED_BINDINGS.includes(requested)) {
      throw new Error(
        `Ismeretlen BLE binding: "${requested}" (lehetséges: ${SUPPORTED_BINDINGS.join(', ')}, auto).`,
      );
    }
    return requested;
  }
  const fallback = PLATFORM_DEFAULTS[platform];
  if (!fallback) {
    throw new Error(`Ezen a platformon nincs támogatott BLE binding: ${platform}`);
  }
  return fallback;
}

let instance = null;
let instanceBinding = null;

/** @returns {import('@stoprocent/noble').Noble} */
export function getNoble({ adapterId = 'hci0', binding } = {}) {
  if (!instance) {
    instanceBinding = resolveBinding({ binding });
    // az adapterId csak a Linuxos (dbus/hci) bindingnél számít — Windowson/macOS-en
    // a rendszer alapértelmezett Bluetooth-adaptere a használt
    const options = instanceBinding === 'dbus' || instanceBinding === 'hci' ? { adapterId } : {};
    instance = withBindings(instanceBinding, options);
  }
  return instance;
}

/** Az éppen használt binding neve (a getNoble() hívása után). */
export function activeBinding() {
  return instanceBinding;
}

/** Platformfüggő tipp, ha a Bluetooth-adapter nem kapcsol be. */
export function adapterHint(binding = instanceBinding) {
  switch (binding) {
    case 'win':
      return 'Kapcsold be a Bluetooth-t (Gépház → Bluetooth és eszközök), és ellenőrizd, hogy a gépben van BLE-képes adapter.';
    case 'mac':
      return 'Kapcsold be a Bluetooth-t, és engedélyezd a terminálnak a Bluetooth-hozzáférést (Adatvédelem és biztonság).';
    default:
      return 'Ellenőrizd, hogy fut a bluetoothd, és a `bluetoothctl show` működik (Powered: yes).';
  }
}

/** Megvárja, hogy az adapter be legyen kapcsolva. */
export async function ensurePoweredOn(noble, timeoutMs = 10000) {
  if (noble.state === 'poweredOn') return;
  try {
    await noble.waitForPoweredOnAsync(timeoutMs);
  } catch (error) {
    const state = noble.state ? ` (állapot: ${noble.state})` : '';
    const wrapped = new Error(`${error?.message || error}${state} — ${adapterHint()}`);
    wrapped.cause = error;
    throw wrapped;
  }
}

/**
 * BLE-címet egységes formába hozza: "00:07:80:66:F0:DB".
 * A BLE random (privát) címek lehető 6 bájtos, "00:07:80" prefixűek is.
 */
export function normalizeAddress(address) {
  if (!address) return '';
  const hex = String(address).replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (hex.length !== 12) return String(address).toUpperCase();
  return hex.match(/.{2}/g).join(':');
}
