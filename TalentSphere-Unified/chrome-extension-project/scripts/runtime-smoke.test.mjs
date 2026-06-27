import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(scriptDir, '..');
const distDir = path.join(extensionRoot, 'dist');
const manifestPath = path.join(distDir, 'manifest.json');
const expectedName = 'TalentSphere Companion';
const headed = process.env.EXTENSION_RUNTIME_HEADED === 'true';
const forcedBrowser = process.env.EXTENSION_RUNTIME_BROWSER_BIN || process.env.EXTENSION_BROWSER_BIN;

const portalFixtures = [
  {
    host: 'www.linkedin.com',
    path: '/jobs/view/runtime-linkedin',
    title: 'Principal Backend Engineer at Acme Labs | LinkedIn',
    expected: {
      source: 'linkedin.com',
      role: 'Principal Backend Engineer',
      company: 'Acme Labs',
    },
    html: `
      <main>
        <h1 class="job-details-jobs-unified-top-card__job-title">Principal Backend Engineer</h1>
        <div class="job-details-jobs-unified-top-card__company-name"><a>Acme Labs</a></div>
        <section id="job-details">Build reliable candidate workflow systems with privacy-safe telemetry and clear release ownership.</section>
      </main>
    `,
  },
  {
    host: 'www.indeed.com',
    path: '/viewjob?jk=runtime-indeed',
    title: 'Senior Data Analyst - Northwind Analytics - Indeed',
    expected: {
      source: 'indeed.com',
      role: 'Senior Data Analyst',
      company: 'Northwind Analytics',
    },
    html: `
      <article>
        <h1 class="jobsearch-JobInfoHeader-title">Senior Data Analyst</h1>
        <div class="jobsearch-InlineCompanyRating"><div>Northwind Analytics</div><div>4.2</div></div>
        <div data-testid="jobDescriptionText">Own analytics datasets, publish stakeholder dashboards, and maintain query-quality checks.</div>
      </article>
    `,
  },
  {
    host: 'www.glassdoor.com',
    path: '/job-listing/runtime-glassdoor',
    title: 'Product Design Lead at BrightWorks Studio - Glassdoor',
    expected: {
      source: 'glassdoor.com',
      role: 'Product Design Lead',
      company: 'BrightWorks Studio',
    },
    html: `
      <div>
        <h1 class="top-card-layout__title">Product Design Lead</h1>
        <a class="topcard__org-name-link">BrightWorks Studio</a>
        <div class="jobDescriptionContent description">Lead design systems, accessibility reviews, and hiring manager workflows for a product team.</div>
      </div>
    `,
  },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withTimeout = (promise, ms, label) => Promise.race([
  promise,
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  }),
]);

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const assertBuiltArtifact = () => {
  assert.equal(fs.existsSync(manifestPath), true, 'Run npm run build before runtime smoke; dist/manifest.json is missing.');

  const manifest = readJson(manifestPath);
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, expectedName);
  assert.equal(manifest.version, '1.0.0');
  assert.equal(manifest.background?.service_worker, 'background.js');
  assert.equal(manifest.action?.default_popup, 'src/popup/index.html');
  assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'scripting', 'storage'].sort());

  for (const iconPath of Object.values(manifest.action?.default_icon || {})) {
    assert.equal(fs.existsSync(path.join(distDir, iconPath)), true, `Manifest icon is missing from dist: ${iconPath}`);
  }

  for (const requiredPath of [
    'background.js',
    'content.js',
    'src/popup/index.html',
    'src/options/index.html',
  ]) {
    assert.equal(fs.existsSync(path.join(distDir, requiredPath)), true, `Built artifact is missing ${requiredPath}`);
  }
};

const candidateBrowserPaths = () => {
  if (forcedBrowser) return [forcedBrowser];

  const candidates = [
    '/Applications/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    'microsoft-edge',
  ];

  return [...new Set(candidates)].filter((candidate) => (
    path.isAbsolute(candidate) ? fs.existsSync(candidate) : true
  ));
};

const getFreePort = async () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.unref();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    server.close(() => resolve(address.port));
  });
});

const getJson = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText} from ${url}`);
  }
  return response.json();
};

const startPortalFixtureServer = async () => {
  const server = http.createServer((request, response) => {
    const host = String(request.headers.host || '').split(':')[0];
    const fixture = portalFixtures.find((candidate) => (
      candidate.host === host && request.url === candidate.path
    )) || portalFixtures.find((candidate) => candidate.host === host);

    if (!fixture) {
      response.statusCode = 404;
      response.end('No portal fixture for host.');
      return;
    }

    response.setHeader('content-type', 'text/html; charset=utf-8');
    response.end(`<!doctype html>
      <html>
        <head>
          <title>${fixture.title}</title>
          <meta name="description" content="Runtime portal fixture for TalentSphere extension smoke tests.">
        </head>
        <body>${fixture.html}</body>
      </html>`);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  return {
    port: server.address().port,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
};

class LocalWebSocket {
  constructor(webSocketDebuggerUrl) {
    const parsed = new URL(webSocketDebuggerUrl);
    assert.equal(parsed.protocol, 'ws:', 'Only local ws:// CDP endpoints are supported.');

    this.url = parsed;
    this.listeners = {
      open: [],
      message: [],
      error: [],
      close: [],
    };
    this.buffer = Buffer.alloc(0);
    this.handshakeComplete = false;
    this.handshakeBuffer = Buffer.alloc(0);
    this.acceptKey = null;

    this.socket = net.createConnection({
      host: parsed.hostname,
      port: Number(parsed.port || 80),
    });
    this.socket.on('connect', () => this.sendHandshake());
    this.socket.on('data', (chunk) => this.handleData(chunk));
    this.socket.on('error', (err) => this.emit('error', err));
    this.socket.on('close', () => this.emit('close', {}));
  }

  addEventListener(type, listener, options = {}) {
    this.listeners[type]?.push({ listener, once: Boolean(options.once) });
  }

  emit(type, event) {
    const listeners = this.listeners[type] || [];
    this.listeners[type] = listeners.filter(({ listener, once }) => {
      listener(event);
      return !once;
    });
  }

  sendHandshake() {
    const key = randomBytes(16).toString('base64');
    this.acceptKey = createHash('sha1')
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64');
    const pathAndQuery = `${this.url.pathname}${this.url.search}`;
    const host = this.url.port ? `${this.url.hostname}:${this.url.port}` : this.url.hostname;

    this.socket.write([
      `GET ${pathAndQuery} HTTP/1.1`,
      `Host: ${host}`,
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Key: ${key}`,
      'Sec-WebSocket-Version: 13',
      '\r\n',
    ].join('\r\n'));
  }

  handleData(chunk) {
    if (!this.handshakeComplete) {
      this.handshakeBuffer = Buffer.concat([this.handshakeBuffer, chunk]);
      const headerEnd = this.handshakeBuffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;

      const headers = this.handshakeBuffer.subarray(0, headerEnd).toString('utf8');
      if (!headers.startsWith('HTTP/1.1 101')) {
        this.emit('error', new Error(`CDP websocket upgrade failed: ${headers.split('\r\n')[0]}`));
        return;
      }
      const headerLines = headers.split('\r\n').slice(1);
      const headerMap = new Map(headerLines.map((line) => {
        const separatorIndex = line.indexOf(':');
        return [
          line.slice(0, separatorIndex).trim().toLowerCase(),
          line.slice(separatorIndex + 1).trim(),
        ];
      }));
      if (headerMap.get('sec-websocket-accept') !== this.acceptKey) {
        this.emit('error', new Error('CDP websocket upgrade returned an invalid accept key.'));
        return;
      }

      this.handshakeComplete = true;
      this.emit('open', {});
      const remainder = this.handshakeBuffer.subarray(headerEnd + 4);
      this.handshakeBuffer = Buffer.alloc(0);
      if (remainder.length === 0) return;
      this.buffer = Buffer.concat([this.buffer, remainder]);
    } else {
      this.buffer = Buffer.concat([this.buffer, chunk]);
    }

    this.parseFrames();
  }

  parseFrames() {
    while (this.buffer.length >= 2) {
      const first = this.buffer[0];
      const second = this.buffer[1];
      const opcode = first & 0x0f;
      let offset = 2;
      let payloadLength = second & 0x7f;

      if (payloadLength === 126) {
        if (this.buffer.length < offset + 2) return;
        payloadLength = this.buffer.readUInt16BE(offset);
        offset += 2;
      } else if (payloadLength === 127) {
        if (this.buffer.length < offset + 8) return;
        payloadLength = Number(this.buffer.readBigUInt64BE(offset));
        offset += 8;
      }

      const masked = Boolean(second & 0x80);
      const maskLength = masked ? 4 : 0;
      if (this.buffer.length < offset + maskLength + payloadLength) return;

      const mask = masked ? this.buffer.subarray(offset, offset + 4) : null;
      offset += maskLength;
      const payload = Buffer.from(this.buffer.subarray(offset, offset + payloadLength));
      this.buffer = this.buffer.subarray(offset + payloadLength);

      if (mask) {
        for (let index = 0; index < payload.length; index += 1) {
          payload[index] ^= mask[index % 4];
        }
      }

      if (opcode === 0x1) {
        this.emit('message', { data: payload.toString('utf8') });
      } else if (opcode === 0x8) {
        this.close();
        this.emit('close', {});
      } else if (opcode === 0x9) {
        this.sendFrame(payload, 0xA);
      }
    }
  }

  send(data) {
    this.sendFrame(Buffer.from(data, 'utf8'), 0x1);
  }

  sendFrame(payload, opcode) {
    const length = payload.length;
    let header;
    if (length < 126) {
      header = Buffer.alloc(2);
      header[1] = 0x80 | length;
    } else if (length <= 0xffff) {
      header = Buffer.alloc(4);
      header[1] = 0x80 | 126;
      header.writeUInt16BE(length, 2);
    } else {
      header = Buffer.alloc(10);
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(length), 2);
    }
    header[0] = 0x80 | opcode;

    const mask = randomBytes(4);
    const maskedPayload = Buffer.from(payload);
    for (let index = 0; index < maskedPayload.length; index += 1) {
      maskedPayload[index] ^= mask[index % 4];
    }

    this.socket.write(Buffer.concat([header, mask, maskedPayload]));
  }

  close() {
    try {
      this.socket.end();
    } catch {
      // Best-effort cleanup only.
    }
  }
}

const createWebSocket = (webSocketDebuggerUrl) => {
  if (typeof WebSocket === 'function') {
    return new WebSocket(webSocketDebuggerUrl);
  }

  return new LocalWebSocket(webSocketDebuggerUrl);
};

class CdpClient {
  constructor(webSocketDebuggerUrl) {
    this.webSocketDebuggerUrl = webSocketDebuggerUrl;
    this.nextId = 1;
    this.pending = new Map();
  }

  async open() {
    this.ws = createWebSocket(this.webSocketDebuggerUrl);
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;

      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);

      if (message.error) {
        reject(new Error(JSON.stringify(message.error)));
        return;
      }

      resolve(message.result);
    });

    await withTimeout(new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    }), 3000, 'CDP websocket open');
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    this.ws.send(JSON.stringify({ id, method, params }));

    return withTimeout(new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    }), 7000, method);
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      // Best-effort cleanup only.
    }
  }
}

const launchBrowser = async (browserPath, port, userDataDir, portalServerPort) => {
  const hostResolverRules = portalFixtures
    .map((fixture) => `MAP ${fixture.host} 127.0.0.1`)
    .join(', ');
  const args = [
    `--remote-debugging-port=${port}`,
    '--remote-debugging-address=127.0.0.1',
    `--host-resolver-rules=${hostResolverRules}`,
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-component-update',
    '--disable-domain-reliability',
    '--disable-sync',
    '--metrics-recording-only',
    '--disable-default-apps',
    '--no-default-browser-check',
    '--no-first-run',
    '--disable-crash-reporter',
    `--user-data-dir=${userDataDir}`,
    `--load-extension=${distDir}`,
    `http://${portalFixtures[0].host}:${portalServerPort}${portalFixtures[0].path}`,
  ];

  if (!headed) args.unshift('--headless=new');

  const browser = spawn(browserPath, args, {
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  browser.launchError = null;
  browser.on('error', (err) => {
    browser.launchError = err;
  });

  return browser;
};

const stopBrowser = async (browser) => {
  if (!browser?.pid) return;

  try {
    if (process.platform === 'win32') {
      browser.kill('SIGTERM');
    } else {
      process.kill(-browser.pid, 'SIGTERM');
    }
  } catch {
    try {
      browser.kill('SIGTERM');
    } catch {
      // Best-effort cleanup only.
    }
  }

  await sleep(1000);
};

const waitForCdp = async (port, browser) => {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (browser?.launchError) {
      throw browser.launchError;
    }
    try {
      return await getJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await sleep(250);
    }
  }

  throw new Error('Browser did not expose a CDP endpoint.');
};

const findTalentSphereWorker = async (port) => {
  const inspectedWorkers = [];

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const targets = await getJson(`http://127.0.0.1:${port}/json/list`);
    const workers = targets.filter((target) => target.type === 'service_worker');

    for (const worker of workers) {
      const client = new CdpClient(worker.webSocketDebuggerUrl);
      try {
        await client.open();
        await client.send('Runtime.enable');
        const nameResult = await client.send('Runtime.evaluate', {
          expression: 'chrome.runtime.getManifest().name',
          returnByValue: true,
        });
        const name = nameResult.result?.value;
        inspectedWorkers.push({ url: worker.url, name });

        if (name === expectedName) {
          return { worker, client, inspectedWorkers };
        }
      } catch (err) {
        inspectedWorkers.push({ url: worker.url, error: String(err.message || err) });
      }

      client.close();
    }

    await sleep(500);
  }

  throw new Error(`TalentSphere service worker was not found. Inspected workers: ${JSON.stringify(inspectedWorkers)}`);
};

const openPopupTarget = async (port, extensionId) => {
  const popupUrl = `chrome-extension://${extensionId}/src/popup/index.html`;
  const target = await getJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(popupUrl)}`, {
    method: 'PUT',
  });
  await sleep(1500);
  return { popupUrl, target };
};

const openPortalTarget = async (port, fixture, portalServerPort) => {
  const portalUrl = `http://${fixture.host}:${portalServerPort}${fixture.path}`;
  const target = await getJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(portalUrl)}`, {
    method: 'PUT',
  });
  await sleep(1500);
  return { portalUrl, target };
};

const runPortalFixtureAssertion = async (workerClient, fixture, portalUrl) => {
  const result = await workerClient.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `
      (async () => {
        const tabs = await new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
        const tab = tabs[0];
        const response = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: 'scrape_job_metadata' }, (metadata) => {
            resolve({
              metadata,
              lastError: chrome.runtime.lastError?.message || '',
              tab: {
                id: tab.id,
                title: tab.title,
                url: tab.url,
              },
            });
          });
        });
        return response;
      })()
    `,
  });

  if (result.exceptionDetails) {
    throw new Error(JSON.stringify(result.exceptionDetails));
  }

  const value = result.result.value;
  assert.equal(value.lastError, '', `${fixture.host} content script should respond`);
  assert.equal(value.metadata.status, 'success', fixture.host);
  assert.equal(value.metadata.source, fixture.expected.source, fixture.host);
  assert.equal(value.metadata.role, fixture.expected.role, fixture.host);
  assert.equal(value.metadata.company, fixture.expected.company, fixture.host);
  assert.equal(value.metadata.url, portalUrl, fixture.host);
  assert.equal(value.metadata.confidence, 'high', fixture.host);
  assert.ok(value.metadata.description.length > 40, `${fixture.host} should return a useful description excerpt`);
  assert.equal(value.metadata.description.includes('<'), false, `${fixture.host} description should be plain text`);

  return value.metadata;
};

const runPopupAssertions = async (target) => {
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.open();
  await client.send('Runtime.enable');

  try {
    const result = await client.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const waitForPopupRoot = async () => {
            for (let attempt = 0; attempt < 30; attempt += 1) {
              const root = document.querySelector('#root');
              if (root?.children.length > 0) return root;
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            return document.querySelector('#root');
          };
          const popupRoot = await waitForPopupRoot();
          const manifest = chrome.runtime.getManifest();
          const storageKey = 'ts_runtime_smoke_' + Date.now();
          await chrome.storage.local.set({ [storageKey]: { ok: true } });
          const stored = await chrome.storage.local.get(storageKey);
          await chrome.storage.local.remove(storageKey);
          const ping = await new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
              }
              resolve(response);
            });
          });

          return {
            id: chrome.runtime.id,
            manifestVersion: manifest.manifest_version,
            name: manifest.name,
            version: manifest.version,
            permissions: manifest.permissions,
            pageTitle: document.title,
            popupRootExists: Boolean(popupRoot),
            popupRootChildCount: popupRoot?.children.length || 0,
            storageRoundTrip: Boolean(stored[storageKey]?.ok),
            pingStatus: ping?.status,
            hasPingTimestamp: typeof ping?.timestamp === 'number',
          };
        })()
      `,
    });

    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result.exceptionDetails));
    }

    return result.result.value;
  } finally {
    client.close();
  }
};

const runSmokeWithBrowser = async (browserPath) => {
  const port = await getFreePort();
  const portalServer = await startPortalFixtureServer();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'talentsphere-extension-runtime-'));
  const browser = await launchBrowser(browserPath, port, userDataDir, portalServer.port);
  let stderr = '';
  browser.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    const browserVersion = await waitForCdp(port, browser);
    await sleep(3000);

    const { worker, client } = await findTalentSphereWorker(port);
    const workerInfo = await client.send('Runtime.evaluate', {
      expression: '(() => ({ id: chrome.runtime.id, manifest: chrome.runtime.getManifest() }))()',
      returnByValue: true,
    });

    const extensionId = workerInfo.result.value.id;
    const portalResults = [];
    for (const fixture of portalFixtures) {
      const { portalUrl } = await openPortalTarget(port, fixture, portalServer.port);
      const metadata = await runPortalFixtureAssertion(client, fixture, portalUrl);
      portalResults.push({
        host: fixture.host,
        role: metadata.role,
        company: metadata.company,
        source: metadata.source,
      });
    }
    client.close();

    const { popupUrl, target } = await openPopupTarget(port, extensionId);
    const popupResult = await runPopupAssertions(target);

    assert.equal(popupResult.name, expectedName);
    assert.equal(popupResult.manifestVersion, 3);
    assert.equal(popupResult.version, '1.0.0');
    assert.deepEqual([...popupResult.permissions].sort(), ['activeTab', 'scripting', 'storage'].sort());
    assert.equal(popupResult.pageTitle, 'TalentSphere Companion - Popup');
    assert.equal(popupResult.popupRootExists, true);
    assert.ok(
      popupResult.popupRootChildCount > 0,
      `Popup React root should render children: ${JSON.stringify(popupResult)}`
    );
    assert.equal(popupResult.storageRoundTrip, true);
    assert.equal(popupResult.pingStatus, 'active');
    assert.equal(popupResult.hasPingTimestamp, true);

    return {
      browserPath,
      browser: browserVersion.Browser,
      extensionId,
      workerUrl: worker.url,
      popupUrl,
      portalResults,
      popupResult,
    };
  } catch (err) {
    throw new Error([
      `${browserPath}: ${err.message || err}`,
      stderr.split('\n').filter((line) => /load|extension|manifest|icon|error/i.test(line)).slice(0, 20).join('\n'),
    ].filter(Boolean).join('\n'));
  } finally {
    await stopBrowser(browser);
    await portalServer.close();
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }
};

assertBuiltArtifact();

const failures = [];
for (const browserPath of candidateBrowserPaths()) {
  try {
    const result = await runSmokeWithBrowser(browserPath);
    console.log(JSON.stringify({
      status: 'passed',
      headed,
      ...result,
    }, null, 2));
    process.exit(0);
  } catch (err) {
    failures.push(String(err.message || err));
    if (forcedBrowser) break;
  }
}

console.error('extension runtime smoke failed');
console.error(failures.join('\n\n---\n\n'));
process.exit(1);
