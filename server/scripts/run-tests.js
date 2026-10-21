#!/usr/bin/env node
/**
 * Platformfüggetlen tesztfuttató: a `test/*.test.js` fájlokat maga gyűjti össze,
 * mert a Windows cmd.exe (amit az npm Windowson használ) nem bontja ki a
 * `*`-os mintát, a Node 20 pedig magától sem.
 */
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'test');
const files = readdirSync(testDir)
  .filter((name) => name.endsWith('.test.js'))
  .sort()
  .map((name) => path.join(testDir, name));

const result = spawnSync(process.execPath, ['--test', ...process.argv.slice(2), ...files], {
  stdio: 'inherit',
});
process.exit(result.status ?? 1);
