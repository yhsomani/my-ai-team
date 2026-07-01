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
    }), 15000, method);
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

const openOptionsTarget = async (port, extensionId) => {
  const optionsUrl = `chrome-extension://${extensionId}/src/options/index.html`;
  const target = await getJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(optionsUrl)}`, {
    method: 'PUT',
  });
  await sleep(1500);
  return { optionsUrl, target };
};

const createChromeStorageFailureScript = (methods) => `
  (() => {
    const methods = ${JSON.stringify(methods)};
    const install = () => {
      const local = globalThis.chrome?.storage?.local;
      if (!local) return false;

      for (const method of methods) {
        const fail = () => {
          throw new Error('TalentSphere runtime storage fixture ' + method + ' failure');
        };

        try {
          Object.defineProperty(local, method, {
            configurable: true,
            writable: true,
            value: fail,
          });
        } catch {
          try {
            local[method] = fail;
          } catch {
            return false;
          }
        }
      }

      return true;
    };

    if (!install()) {
      const timer = setInterval(() => {
        if (install()) clearInterval(timer);
      }, 0);
      setTimeout(() => clearInterval(timer), 5000);
    }
  })();
`;

const openTargetWithNewDocumentScript = async (port, url, scriptSource) => {
  const target = await getJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('about:blank')}`, {
    method: 'PUT',
  });
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.open();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Page.addScriptToEvaluateOnNewDocument', {
    source: scriptSource,
  });
  await client.send('Page.navigate', { url });
  await sleep(1500);
  client.close();
  return target;
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

const renderedContrastCollectorSource = `() => {
  const parseColor = (value) => {
    const match = String(value || '').match(/^rgba?\\(([^)]+)\\)$/);
    if (!match) return null;

    const parts = match[1].split(',').map((part) => part.trim());
    if (parts.length < 3) return null;

    return {
      r: Number.parseFloat(parts[0]),
      g: Number.parseFloat(parts[1]),
      b: Number.parseFloat(parts[2]),
      a: parts[3] === undefined ? 1 : Number.parseFloat(parts[3]),
    };
  };

  const blend = (foreground, background) => {
    const alpha = foreground.a + background.a * (1 - foreground.a);
    if (alpha === 0) return { r: 255, g: 255, b: 255, a: 1 };

    return {
      r: (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
      g: (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
      b: (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
      a: alpha,
    };
  };

  const toCssRgb = (color) => 'rgb('
    + Math.round(color.r) + ', '
    + Math.round(color.g) + ', '
    + Math.round(color.b) + ')';

  const linearize = (channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };

  const luminance = (color) => (
    0.2126 * linearize(color.r)
    + 0.7152 * linearize(color.g)
    + 0.0722 * linearize(color.b)
  );

  const contrastRatio = (foreground, background) => {
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0
      && rect.height > 0
      && style.display !== 'none'
      && style.visibility !== 'hidden'
      && Number.parseFloat(style.opacity || '1') >= 0.99;
  };

  const isDisabled = (element) => (
    element.matches(':disabled, [aria-disabled="true"]')
      || Boolean(element.closest(':disabled, [aria-disabled="true"]'))
  );

  const directText = (element) => (
    Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || '')
      .join(' ')
      .replace(/\\s+/g, ' ')
      .trim()
      .slice(0, 90)
  );

  const selectorPreview = (element) => {
    const id = element.id ? '#' + element.id : '';
    const className = typeof element.className === 'string'
      ? element.className.trim().split(/\\s+/).filter(Boolean).slice(0, 3).map((item) => '.' + item).join('')
      : '';
    return element.tagName.toLowerCase() + id + className;
  };

  const effectiveBackground = (element) => {
    const ancestors = [];
    let current = element;

    while (current) {
      ancestors.unshift(current);
      current = current.parentElement;
    }

    let background = { r: 255, g: 255, b: 255, a: 1 };
    for (const ancestor of ancestors) {
      const parsed = parseColor(window.getComputedStyle(ancestor).backgroundColor);
      if (parsed && parsed.a > 0) {
        background = blend(parsed, background);
      }
    }

    return background;
  };

  const requiredRatio = (style) => {
    const fontSize = Number.parseFloat(style.fontSize || '0');
    const fontWeight = Number.parseInt(style.fontWeight || '400', 10);
    const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
    return isLargeText ? 3 : 4.5;
  };

  const issues = [];
  for (const element of Array.from(document.querySelectorAll('body *'))) {
    if (!isVisible(element) || isDisabled(element) || element.closest('[aria-hidden="true"]')) continue;

    const text = directText(element);
    if (!text || !/[A-Za-z0-9]/.test(text)) continue;

    const style = window.getComputedStyle(element);
    const foreground = parseColor(style.color);
    if (!foreground || foreground.a < 0.99) continue;

    const background = effectiveBackground(element);
    const ratio = contrastRatio(foreground, background);
    const minimum = requiredRatio(style);

    if (ratio + 0.01 < minimum) {
      issues.push({
        ratio: Number(ratio.toFixed(2)),
        requiredRatio: minimum,
        selector: selectorPreview(element),
        text,
        foreground: toCssRgb(foreground),
        background: toCssRgb(background),
      });
    }
  }

  return issues.slice(0, 12);
}`;

const assertNoRenderedContrastIssues = (label, issues) => {
  assert.deepEqual(issues, [], `${label} rendered contrast issues: ${JSON.stringify(issues, null, 2)}`);
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
          const collectRenderedContrastIssues = ${renderedContrastCollectorSource};
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
          const waitForStorageSchema = async () => {
            for (let attempt = 0; attempt < 50; attempt += 1) {
              const result = await chrome.storage.local.get('ts_extension_storage_schema');
              const schema = result.ts_extension_storage_schema;
              if (schema?.version === 1 && typeof schema.migratedAt === 'string') {
                return schema;
              }
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            return null;
          };
          const storageSchema = await waitForStorageSchema();
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
            storageSchemaVersion: storageSchema?.version ?? null,
            storageSchemaMigratedAt: storageSchema?.migratedAt ?? '',
            storageRoundTrip: Boolean(stored[storageKey]?.ok),
            pingStatus: ping?.status,
            hasPingTimestamp: typeof ping?.timestamp === 'number',
            contrastIssues: collectRenderedContrastIssues(),
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

const assertSafeVisibleStorageCopy = (label, visibleText) => {
  for (const unsafeFragment of [
    'TalentSphere runtime storage fixture',
    'QuotaExceededError',
    'chrome.runtime.lastError',
    'ts_tracked_jobs',
    'ts_job_scan_draft',
    'ts_extension_operational_analytics',
    'ts_extension_storage_schema',
    'ts_prep',
    'ts_settings_notif',
    'ts_settings_analytics',
    'service_role_token',
  ]) {
    assert.equal(
      visibleText.includes(unsafeFragment),
      false,
      `${label} exposed raw storage detail: ${unsafeFragment}`
    );
  }
};

const runPopupStorageLoadFailureAssertions = async (target) => {
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.open();
  await client.send('Runtime.enable');

  try {
    const result = await client.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const collectRenderedContrastIssues = ${renderedContrastCollectorSource};
          const waitFor = async (predicate, label) => {
            for (let attempt = 0; attempt < 80; attempt += 1) {
              const value = await predicate();
              if (value) return value;
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            throw new Error(label + ' was not ready: ' + document.body.innerText.slice(0, 700));
          };
          const text = (selector) => document.querySelector(selector)?.textContent || '';

          const popupRoot = await waitFor(() => {
            const root = document.querySelector('#root');
            return root?.children.length > 0 ? root : null;
          }, 'Popup React root with storage load failure');
          const storageStatus = await waitFor(
            () => document.querySelector('#popup-storage-status'),
            'Popup storage load warning'
          );

          return {
            popupRootExists: Boolean(popupRoot),
            role: storageStatus.getAttribute('role'),
            title: text('#popup-storage-status p'),
            message: text('#popup-storage-status'),
            footer: document.querySelector('footer')?.textContent || '',
            visibleText: document.body.innerText,
            contrastIssues: collectRenderedContrastIssues(),
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

const runPopupStorageSaveFailureAssertions = async (target) => {
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.open();
  await client.send('Runtime.enable');

  try {
    const result = await client.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const collectRenderedContrastIssues = ${renderedContrastCollectorSource};
          const waitFor = async (predicate, label) => {
            for (let attempt = 0; attempt < 80; attempt += 1) {
              const value = await predicate();
              if (value) return value;
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            throw new Error(label + ' was not ready');
          };
          const setFieldValue = (element, value) => {
            if (!element) throw new Error('Field was not found');
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
            descriptor.set.call(element, value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
          };
          const installStorageFailure = () => {
            const local = chrome.storage.local;
            const fail = () => {
              globalThis.__talentSphereStorageFailureName = 'QuotaExceededError';
              throw new DOMException('Simulated extension storage quota pressure', 'QuotaExceededError');
            };
            try {
              Object.defineProperty(local, 'set', {
                configurable: true,
                writable: true,
                value: fail,
              });
            } catch {
              local.set = fail;
            }
          };
          const text = (selector) => document.querySelector(selector)?.textContent || '';

          await waitFor(() => {
            const root = document.querySelector('#root');
            return root?.children.length > 0 ? root : null;
          }, 'Popup React root');
          document.querySelector('#nav-jobs-tab').click();
          await waitFor(() => document.querySelector('#view-jobs'), 'Jobs view');
          document.querySelector('#toggle-add-job-form').click();
          const addForm = await waitFor(() => document.querySelector('#add-job-form'), 'Add job form');
          const inputs = addForm.querySelectorAll('input');
          setFieldValue(inputs[0], 'Runtime Storage Co');
          setFieldValue(inputs[1], 'Storage Warning Analyst');
          installStorageFailure();
          addForm.querySelector('button[type="submit"]').click();

          const storageStatus = await waitFor(
            () => document.querySelector('#popup-storage-status'),
            'Popup storage save warning'
          );

          return {
            role: storageStatus.getAttribute('role'),
            title: text('#popup-storage-status p'),
            message: text('#popup-storage-status'),
            footer: document.querySelector('footer')?.textContent || '',
            jobVisible: text('#jobs-list').includes('Storage Warning Analyst'),
            storageFailureName: globalThis.__talentSphereStorageFailureName || '',
            visibleText: document.body.innerText,
            contrastIssues: collectRenderedContrastIssues(),
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

const runOptionsAssertions = async (target) => {
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.open();
  await client.send('Runtime.enable');

  try {
    const result = await client.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const collectRenderedContrastIssues = ${renderedContrastCollectorSource};
          const waitFor = async (predicate, label) => {
            for (let attempt = 0; attempt < 80; attempt += 1) {
              const value = await predicate();
              if (value) return value;
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            throw new Error(label + ' was not ready');
          };
          const setFieldValue = (selector, value) => {
            const element = document.querySelector(selector);
            if (!element) throw new Error(selector + ' not found');
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
            descriptor.set.call(element, value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
          };
          const click = (selector) => {
            const element = document.querySelector(selector);
            if (!element) throw new Error(selector + ' not found');
            element.click();
            return element;
          };
          const clickPanelButton = (panelSelector, label) => {
            const panel = document.querySelector(panelSelector);
            if (!panel) throw new Error(panelSelector + ' not found');
            const button = Array.from(panel.querySelectorAll('button'))
              .find((candidate) => candidate.textContent.trim() === label);
            if (!button) throw new Error(label + ' button not found in ' + panelSelector);
            button.click();
            return button;
          };
          const getPrepStorageCount = async () => {
            const storage = await chrome.storage.local.get('ts_prep');
            return Array.isArray(storage.ts_prep) ? storage.ts_prep.length : 0;
          };
          const text = (selector) => document.querySelector(selector)?.textContent || '';

          await chrome.storage.local.remove(['ts_prep', 'ts_settings_notif', 'ts_settings_analytics']);
          const optionsRoot = await waitFor(() => {
            const root = document.querySelector('#root');
            return root?.children.length > 0 ? root : null;
          }, 'Options React root');

          click('#start-optimization-btn');
          const validationPanel = await waitFor(
            () => document.querySelector('#resume-match-input-status'),
            'Resume Match validation panel'
          );
          const invalidState = {
            role: validationPanel.getAttribute('role'),
            title: text('#resume-match-input-status p'),
            jobInvalid: document.querySelector('#job-desc-textarea')?.getAttribute('aria-invalid'),
            resumeInvalid: document.querySelector('#resume-textarea')?.getAttribute('aria-invalid'),
          };

          const jobText = [
            'Principal backend engineer building privacy safe workflow systems with reliable analytics dashboards.',
            'Own React accessibility reviews, TypeScript service contracts, storage migration checks, and release readiness.',
            'Partner with product design to improve candidate and recruiter journeys with clear operational evidence.'
          ].join(' ');
          const resumeText = [
            'Backend engineer with React TypeScript experience building privacy safe workflow tools.',
            'Led accessibility review programs, analytics dashboards, storage migration tests, and release readiness checks.',
            'Partnered with product design and platform teams to improve candidate workflows and operational evidence.'
          ].join(' ');

          setFieldValue('#job-desc-textarea', jobText);
          setFieldValue('#resume-textarea', resumeText);
          click('#start-optimization-btn');

          const readyPanel = await waitFor(
            () => text('#resume-match-input-status').includes('Local preview ready') && document.querySelector('#ai-results-panel'),
            'Resume Match ready report'
          );
          const resultPanel = document.querySelector('#ai-results-panel');
          const scoreText = text('#ai-results-panel');
          const aiContrastIssues = collectRenderedContrastIssues();

          click('#options-prep-tab');
          await waitFor(() => document.querySelector('#opt-view-prep'), 'Interview Planner view');
          click('#submit-prep-btn');
          const prepValidation = await waitFor(
            () => document.querySelector('#prep-topic-validation'),
            'Prep topic validation panel'
          );
          const prepValidationState = {
            role: prepValidation.getAttribute('role'),
            topicInvalid: document.querySelector('#prep-topic-input')?.getAttribute('aria-invalid'),
          };

          setFieldValue('#prep-topic-input', 'Runtime accessibility review');
          click('#submit-prep-btn');
          const prepCard = await waitFor(
            () => Array.from(document.querySelectorAll('#prep-list-container [role="listitem"] button'))
              .find((button) => button.textContent.includes('Runtime accessibility review')),
            'Prep card'
          );
          const prepStorage = await chrome.storage.local.get('ts_prep');
          const beforeTogglePressed = prepCard.getAttribute('aria-pressed');
          prepCard.click();
          const toggledCard = await waitFor(
            () => prepCard.getAttribute('aria-pressed') === 'true' ? prepCard : null,
            'Prep card toggle'
          );
          const prepListRole = document.querySelector('#prep-list-container')?.getAttribute('role');
          click('#clear-prep-btn');
          const prepClearReview = await waitFor(
            () => document.querySelector('#prep-clear-review'),
            'Prep clear review panel'
          );
          const prepClearReviewState = {
            role: prepClearReview.getAttribute('role'),
            title: text('#prep-clear-review p'),
            expanded: document.querySelector('#clear-prep-btn')?.getAttribute('aria-expanded'),
          };
          clickPanelButton('#prep-clear-review', 'Keep Cards');
          await waitFor(
            () => !document.querySelector('#prep-clear-review'),
            'Prep clear review cancel'
          );
          const prepStorageCountAfterClearCancel = await getPrepStorageCount();

          click('#clear-prep-btn');
          await waitFor(() => document.querySelector('#prep-clear-review'), 'Prep clear review confirm panel');
          clickPanelButton('#prep-clear-review', 'Clear Cards');
          await waitFor(
            async () => await getPrepStorageCount() === 0 && !document.querySelector('#prep-list-container [role="listitem"]'),
            'Prep cards clear confirmation'
          );
          const prepStorageCountAfterClearConfirm = await getPrepStorageCount();
          const prepEmptyStateVisible = text('#prep-list-container').includes('No preparation cards yet');
          const prepContrastIssues = collectRenderedContrastIssues();

          setFieldValue('#prep-topic-input', 'Settings reset runtime review');
          click('#submit-prep-btn');
          await waitFor(
            () => Array.from(document.querySelectorAll('#prep-list-container [role="listitem"] button'))
              .find((button) => button.textContent.includes('Settings reset runtime review')),
            'Settings reset prep card'
          );

          click('#options-settings-tab');
          await waitFor(() => document.querySelector('#opt-view-settings'), 'Local Settings view');
          click('#reset-prep-cards-btn');
          const settingsResetReview = await waitFor(
            () => document.querySelector('#settings-prep-clear-review'),
            'Settings prep reset review panel'
          );
          const settingsResetReviewState = {
            role: settingsResetReview.getAttribute('role'),
            title: text('#settings-prep-clear-review h4'),
            expanded: document.querySelector('#reset-prep-cards-btn')?.getAttribute('aria-expanded'),
          };
          clickPanelButton('#settings-prep-clear-review', 'Keep Cards');
          await waitFor(
            () => !document.querySelector('#settings-prep-clear-review'),
            'Settings prep reset cancel'
          );
          const prepStorageCountAfterResetCancel = await getPrepStorageCount();

          click('#reset-prep-cards-btn');
          await waitFor(() => document.querySelector('#settings-prep-clear-review'), 'Settings prep reset confirm panel');
          clickPanelButton('#settings-prep-clear-review', 'Clear Cards');
          await waitFor(
            async () => await getPrepStorageCount() === 0 && document.querySelector('#reset-prep-cards-btn')?.disabled,
            'Settings prep reset confirmation'
          );
          const prepStorageCountAfterResetConfirm = await getPrepStorageCount();
          const settingsContrastIssues = collectRenderedContrastIssues();

          return {
            pageTitle: document.title,
            optionsRootExists: Boolean(optionsRoot),
            optionsRootChildCount: optionsRoot?.children.length || 0,
            validationPanel: invalidState,
            resultRegionRole: resultPanel?.getAttribute('role'),
            resultRegionLabel: resultPanel?.getAttribute('aria-labelledby'),
            resultTextIncludesReady: scoreText.includes('Local Preview Ready'),
            resultTextIncludesCoverage: scoreText.includes('Keyword coverage'),
            prepValidation: prepValidationState,
            prepListRole,
            prepCardBeforeTogglePressed: beforeTogglePressed,
            prepCardAfterTogglePressed: toggledCard.getAttribute('aria-pressed'),
            prepStorageCount: Array.isArray(prepStorage.ts_prep) ? prepStorage.ts_prep.length : 0,
            prepStorageTopic: Array.isArray(prepStorage.ts_prep) ? prepStorage.ts_prep[0]?.topic : '',
            prepClearReview: prepClearReviewState,
            prepStorageCountAfterClearCancel,
            prepStorageCountAfterClearConfirm,
            prepEmptyStateVisible,
            settingsResetReview: settingsResetReviewState,
            prepStorageCountAfterResetCancel,
            prepStorageCountAfterResetConfirm,
            resetButtonDisabledAfterConfirm: Boolean(document.querySelector('#reset-prep-cards-btn')?.disabled),
            aiContrastIssues,
            prepContrastIssues,
            settingsContrastIssues,
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

const runOptionsStorageLoadFailureAssertions = async (target) => {
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.open();
  await client.send('Runtime.enable');

  try {
    const result = await client.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const collectRenderedContrastIssues = ${renderedContrastCollectorSource};
          const waitFor = async (predicate, label) => {
            for (let attempt = 0; attempt < 80; attempt += 1) {
              const value = await predicate();
              if (value) return value;
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            throw new Error(label + ' was not ready');
          };
          const text = (selector) => document.querySelector(selector)?.textContent || '';

          await waitFor(() => {
            const root = document.querySelector('#root');
            return root?.children.length > 0 ? root : null;
          }, 'Options React root with storage load failure');
          await waitFor(() => {
            document.querySelector('#options-prep-tab')?.click();
            return document.querySelector('#opt-view-prep');
          }, 'Options storage load Prep view');
          const prepStatus = await waitFor(
            () => text('#prep-storage-status').includes('Preparation cards could not load')
              ? document.querySelector('#prep-storage-status')
              : null,
            'Prep storage load warning'
          );
          const prepStorageState = {
            role: prepStatus.getAttribute('role'),
            title: text('#prep-storage-status p'),
            message: text('#prep-storage-status'),
          };

          await waitFor(() => {
            document.querySelector('#options-settings-tab')?.click();
            return document.querySelector('#opt-view-settings');
          }, 'Options storage load Settings view');
          const settingsStatus = await waitFor(
            () => text('#settings-storage-status').includes('Local settings could not load')
              ? document.querySelector('#settings-storage-status')
              : null,
            'Settings storage load warning'
          );

          return {
            prep: prepStorageState,
            settings: {
              role: settingsStatus.getAttribute('role'),
              title: text('#settings-storage-status p'),
              message: text('#settings-storage-status'),
            },
            visibleText: document.body.innerText,
            contrastIssues: collectRenderedContrastIssues(),
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

const runOptionsStorageSaveFailureAssertions = async (target) => {
  const client = new CdpClient(target.webSocketDebuggerUrl);
  await client.open();
  await client.send('Runtime.enable');

  try {
    const result = await client.send('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const collectRenderedContrastIssues = ${renderedContrastCollectorSource};
          const waitFor = async (predicate, label) => {
            for (let attempt = 0; attempt < 80; attempt += 1) {
              const value = await predicate();
              if (value) return value;
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            throw new Error(label + ' was not ready: ' + document.body.innerText.slice(0, 700));
          };
          const setFieldValue = (selector, value) => {
            const element = document.querySelector(selector);
            if (!element) throw new Error(selector + ' not found');
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value');
            descriptor.set.call(element, value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
          };
          const installStorageFailure = () => {
            const local = chrome.storage.local;
            const fail = () => {
              globalThis.__talentSphereStorageFailureName = 'QuotaExceededError';
              throw new DOMException('Simulated extension storage quota pressure', 'QuotaExceededError');
            };
            try {
              Object.defineProperty(local, 'set', {
                configurable: true,
                writable: true,
                value: fail,
              });
            } catch {
              local.set = fail;
            }
          };
          const text = (selector) => document.querySelector(selector)?.textContent || '';

          await chrome.storage.local.remove(['ts_prep', 'ts_settings_notif', 'ts_settings_analytics']);
          await waitFor(() => {
            const root = document.querySelector('#root');
            return root?.children.length > 0 ? root : null;
          }, 'Options React root');
          installStorageFailure();

          await waitFor(() => {
            document.querySelector('#options-prep-tab')?.click();
            return document.querySelector('#opt-view-prep');
          }, 'Options storage save Prep view');
          setFieldValue('#prep-topic-input', 'Runtime storage save review');
          document.querySelector('#submit-prep-btn').click();
          const prepStatus = await waitFor(
            () => text('#prep-storage-status').includes('Preparation cards may not persist')
              ? document.querySelector('#prep-storage-status')
              : null,
            'Prep storage save warning'
          );
          const prepCardVisible = text('#prep-list-container').includes('Runtime storage save review');
          const prepStorageState = {
            role: prepStatus.getAttribute('role'),
            title: text('#prep-storage-status p'),
            message: text('#prep-storage-status'),
            cardVisible: prepCardVisible,
          };

          await waitFor(() => {
            document.querySelector('#options-settings-tab')?.click();
            return document.querySelector('#opt-view-settings');
          }, 'Options storage save Settings view');
          const notificationsButton = document.querySelector('#toggle-notifications');
          const beforeNotificationsPressed = notificationsButton?.getAttribute('aria-pressed');
          notificationsButton.click();
          const settingsStatus = await waitFor(
            () => text('#settings-storage-status').includes('Local settings may not persist')
              ? document.querySelector('#settings-storage-status')
              : null,
            'Settings storage save warning'
          );

          return {
            prep: prepStorageState,
            settings: {
              role: settingsStatus.getAttribute('role'),
              title: text('#settings-storage-status p'),
              message: text('#settings-storage-status'),
              beforeNotificationsPressed,
              afterNotificationsPressed: notificationsButton?.getAttribute('aria-pressed'),
            },
            storageFailureName: globalThis.__talentSphereStorageFailureName || '',
            visibleText: document.body.innerText,
            contrastIssues: collectRenderedContrastIssues(),
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
    const { optionsUrl, target: optionsTarget } = await openOptionsTarget(port, extensionId);
    const optionsResult = await runOptionsAssertions(optionsTarget);
    const popupStorageLoadFailureTarget = await openTargetWithNewDocumentScript(
      port,
      popupUrl,
      createChromeStorageFailureScript(['get'])
    );
    const popupStorageLoadFailure = await runPopupStorageLoadFailureAssertions(popupStorageLoadFailureTarget);
    const { target: popupStorageSaveFailureTarget } = await openPopupTarget(port, extensionId);
    const popupStorageSaveFailure = await runPopupStorageSaveFailureAssertions(popupStorageSaveFailureTarget);
    const optionsStorageLoadFailureTarget = await openTargetWithNewDocumentScript(
      port,
      optionsUrl,
      createChromeStorageFailureScript(['get'])
    );
    const optionsStorageLoadFailure = await runOptionsStorageLoadFailureAssertions(optionsStorageLoadFailureTarget);
    const { target: optionsStorageSaveFailureTarget } = await openOptionsTarget(port, extensionId);
    const optionsStorageSaveFailure = await runOptionsStorageSaveFailureAssertions(optionsStorageSaveFailureTarget);

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
    assert.equal(popupResult.storageSchemaVersion, 1);
    assert.match(popupResult.storageSchemaMigratedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(popupResult.storageRoundTrip, true);
    assert.equal(popupResult.pingStatus, 'active');
    assert.equal(popupResult.hasPingTimestamp, true);
    assertNoRenderedContrastIssues('Extension popup default runtime view', popupResult.contrastIssues);
    assert.equal(optionsResult.pageTitle, 'TalentSphere Companion - Options Dashboard');
    assert.equal(optionsResult.optionsRootExists, true);
    assert.ok(
      optionsResult.optionsRootChildCount > 0,
      `Options React root should render children: ${JSON.stringify(optionsResult)}`
    );
    assert.deepEqual(optionsResult.validationPanel, {
      role: 'alert',
      title: 'Comparison needs both text areas',
      jobInvalid: 'true',
      resumeInvalid: 'true',
    });
    assert.equal(optionsResult.resultRegionRole, 'region');
    assert.equal(optionsResult.resultRegionLabel, 'alignment-report-title');
    assert.equal(optionsResult.resultTextIncludesReady, true);
    assert.equal(optionsResult.resultTextIncludesCoverage, true);
    assert.deepEqual(optionsResult.prepValidation, {
      role: 'alert',
      topicInvalid: 'true',
    });
    assert.equal(optionsResult.prepListRole, 'list');
    assert.equal(optionsResult.prepCardBeforeTogglePressed, 'false');
    assert.equal(optionsResult.prepCardAfterTogglePressed, 'true');
    assert.equal(optionsResult.prepStorageCount, 1);
    assert.equal(optionsResult.prepStorageTopic, 'Runtime accessibility review');
    assert.deepEqual(optionsResult.prepClearReview, {
      role: 'alert',
      title: 'Clear all preparation cards?',
      expanded: 'true',
    });
    assert.equal(optionsResult.prepStorageCountAfterClearCancel, 1);
    assert.equal(optionsResult.prepStorageCountAfterClearConfirm, 0);
    assert.equal(optionsResult.prepEmptyStateVisible, true);
    assert.deepEqual(optionsResult.settingsResetReview, {
      role: 'alert',
      title: 'Clear interview planner cards?',
      expanded: 'true',
    });
    assert.equal(optionsResult.prepStorageCountAfterResetCancel, 1);
    assert.equal(optionsResult.prepStorageCountAfterResetConfirm, 0);
    assert.equal(optionsResult.resetButtonDisabledAfterConfirm, true);
    assertNoRenderedContrastIssues('Extension options Resume Match runtime view', optionsResult.aiContrastIssues);
    assertNoRenderedContrastIssues('Extension options Interview Planner runtime view', optionsResult.prepContrastIssues);
    assertNoRenderedContrastIssues('Extension options Settings runtime view', optionsResult.settingsContrastIssues);
    assert.deepEqual(popupStorageLoadFailure, {
      popupRootExists: true,
      role: 'alert',
      title: 'Local popup data could not load',
      message: popupStorageLoadFailure.message,
      footer: 'React extensionLocal storage needs attention',
      visibleText: popupStorageLoadFailure.visibleText,
      contrastIssues: popupStorageLoadFailure.contrastIssues,
    });
    assert.equal(
      popupStorageLoadFailure.message.includes('using defaults for this session'),
      true,
      JSON.stringify(popupStorageLoadFailure)
    );
    assertSafeVisibleStorageCopy('Popup storage load warning', popupStorageLoadFailure.visibleText);
    assertNoRenderedContrastIssues('Extension popup storage-load warning runtime view', popupStorageLoadFailure.contrastIssues);
    assert.equal(popupStorageSaveFailure.role, 'alert');
    assert.equal(popupStorageSaveFailure.title, 'Local popup data may not persist');
    assert.equal(
      popupStorageSaveFailure.message.includes('could not save it locally'),
      true,
      JSON.stringify(popupStorageSaveFailure)
    );
    assert.equal(popupStorageSaveFailure.footer, 'React extensionLocal storage needs attention');
    assert.equal(popupStorageSaveFailure.jobVisible, true);
    assert.equal(popupStorageSaveFailure.storageFailureName, 'QuotaExceededError');
    assertSafeVisibleStorageCopy('Popup storage save warning', popupStorageSaveFailure.visibleText);
    assertNoRenderedContrastIssues('Extension popup storage-save warning runtime view', popupStorageSaveFailure.contrastIssues);
    assert.deepEqual(optionsStorageLoadFailure.prep, {
      role: 'alert',
      title: 'Preparation cards could not load',
      message: optionsStorageLoadFailure.prep.message,
    });
    assert.equal(
      optionsStorageLoadFailure.prep.message.includes('using this session only'),
      true,
      JSON.stringify(optionsStorageLoadFailure)
    );
    assert.deepEqual(optionsStorageLoadFailure.settings, {
      role: 'alert',
      title: 'Local settings could not load',
      message: optionsStorageLoadFailure.settings.message,
    });
    assert.equal(
      optionsStorageLoadFailure.settings.message.includes('using defaults for this session'),
      true,
      JSON.stringify(optionsStorageLoadFailure)
    );
    assertSafeVisibleStorageCopy('Options storage load warning', optionsStorageLoadFailure.visibleText);
    assertNoRenderedContrastIssues('Extension options storage-load warning runtime view', optionsStorageLoadFailure.contrastIssues);
    assert.deepEqual(optionsStorageSaveFailure.prep, {
      role: 'alert',
      title: 'Preparation cards may not persist',
      message: optionsStorageSaveFailure.prep.message,
      cardVisible: true,
    });
    assert.equal(
      optionsStorageSaveFailure.prep.message.includes('could not save it locally'),
      true,
      JSON.stringify(optionsStorageSaveFailure)
    );
    assert.equal(optionsStorageSaveFailure.settings.role, 'alert');
    assert.equal(optionsStorageSaveFailure.settings.title, 'Local settings may not persist');
    assert.equal(
      optionsStorageSaveFailure.settings.message.includes('could not save it locally'),
      true,
      JSON.stringify(optionsStorageSaveFailure)
    );
    assert.notEqual(
      optionsStorageSaveFailure.settings.beforeNotificationsPressed,
      optionsStorageSaveFailure.settings.afterNotificationsPressed,
      JSON.stringify(optionsStorageSaveFailure)
    );
    assert.equal(optionsStorageSaveFailure.storageFailureName, 'QuotaExceededError');
    assertSafeVisibleStorageCopy('Options storage save warning', optionsStorageSaveFailure.visibleText);
    assertNoRenderedContrastIssues('Extension options storage-save warning runtime view', optionsStorageSaveFailure.contrastIssues);

    return {
      browserPath,
      browser: browserVersion.Browser,
      extensionId,
      workerUrl: worker.url,
      popupUrl,
      optionsUrl,
      portalResults,
      popupResult,
      optionsResult,
      popupStorageLoadFailure,
      popupStorageSaveFailure,
      optionsStorageLoadFailure,
      optionsStorageSaveFailure,
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
