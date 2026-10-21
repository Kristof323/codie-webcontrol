import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverDir = path.resolve(here, '..');
const loader = pathToFileURL(path.join(here, 'fixtures', 'noble-loader.js')).href;

test('a valódi belépési pont szóközös, ékezetes és # karakteres útvonalon is HTTP szervert indít',
  { timeout: 20000 }, async (t) => {
    // A server/ alatt maradunk, így a szülő node_modules Windows symlink nélkül is elérhető.
    const tempDir = await mkdtemp(path.join(here, '.startup ékezet # '));
    t.after(() => rm(tempDir, { recursive: true, force: true }));
    await cp(path.join(serverDir, 'src'), path.join(tempDir, 'src'), { recursive: true });
    await cp(path.join(serverDir, 'public'), path.join(tempDir, 'public'), { recursive: true });
    await cp(path.join(serverDir, 'package.json'), path.join(tempDir, 'package.json'));

    const child = spawn(process.execPath, [
      '--experimental-loader', loader, path.join(tempDir, 'src', 'index.js'),
    ], {
      cwd: tempDir,
      env: { ...process.env, HOST: '127.0.0.1', PORT: '0',
        CODIE_AUTO_CONNECT: '', CODIE_MAC_ONLY: '0', CODIE_BLE_BINDING: 'auto' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    // A Windows nem kezel minden POSIX jelet; a tesztben kényszerített takarítás kell.
    t.after(async () => {
      if (child.exitCode === null && child.signalCode === null) {
        await new Promise((resolve) => {
          child.once('close', resolve);
          child.kill('SIGKILL');
        });
      }
    });
    child.stderr.on('data', (data) => { stderr += data; });

    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Nincs indítási üzenet: ${stdout}\n${stderr}`)), 10000);
      const finish = (callback, value) => { clearTimeout(timer); callback(value); };
      child.on('error', (error) => finish(reject, error));
      child.on('close', (code) => finish(reject, new Error(`Korai kilépés (${code}): ${stdout}\n${stderr}`)));
      child.stdout.on('data', (data) => {
        stdout += data;
        const match = stdout.match(/szerver listening: (http:\/\/127\.0\.0\.1:\d+)/);
        if (match) finish(resolve, match[1]);
      });
    });
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Codie/i);
    assert.equal(child.exitCode, null, 'a szerver futva marad');
  });
