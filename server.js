import express from 'express';
import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const OPENAI_KEY = process.env.OPENAI_API_KEY || '';
const SITE_ROOT = process.env.SITE_ROOT || 'https://www.incaltamintelamoda.ro';

let crawlQueue = [];
let discovered = new Set();
let crawling = false;

// Helpers
const normalizeUrl = (base, url) => {
  try {
    if (!url) return null;
    // ignore anchors and mailto/tel
    if (url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('javascript:')) return null;
    if (url.startsWith('//')) url = 'https:' + url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      // only same-host
      const u = new URL(url);
      const baseHost = new URL(base).host;
      if (u.host !== baseHost) return null;
      return u.pathname + u.search;
    }
    // relative
    if (url.startsWith('/')) return url;
    // other relative
    return new URL(url, base).pathname + new URL(url, base).search;
  } catch (e) {
    return null;
  }
};

async function fetchHtml(path) {
  const url = path.startsWith('http') ? path : SITE_ROOT.replace(/\/$/, '') + path;
  const res = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'SEO-Bot/1.0 (+https://vercel.app)' } });
  if (!res.ok) throw new Error('Fetch failed: ' + res.status);
  const text = await res.text();
  return text;
}

function extractLinks(html, basePath) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const anchors = [...doc.querySelectorAll('a[href]')];
  const links = anchors.map(a => a.getAttribute('href')).map(h => normalizeUrl(SITE_ROOT + basePath, h)).filter(Boolean);
  return Array.from(new Set(links));
}

function extractMeta(html) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const title = doc.querySelector('title')?.textContent || '';
  const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const robots = doc.querySelector('meta[name="robots"]')?.getAttribute('content') || '';
  return { title, description, robots };
}

// Simple crawler worker
async function crawlWorker(limit = 50) {
  if (crawling) return;
  crawling = true;
  try {
    while (crawlQueue.length > 0 && discovered.size < limit) {
      const path = crawlQueue.shift();
      if (!path) continue;
      try {
        const html = await fetchHtml(path);
        const links = extractLinks(html, path);
        links.forEach(l => {
          if (!discovered.has(l)) {
            discovered.add(l);
            crawlQueue.push(l);
          }
        });
      } catch (e) {
        console.log('crawl error for', path, e.message);
      }
    }
  } finally {
    crawling = false;
  }
}

// Routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    discovered: discovered.size,
    queue: crawlQueue.length,
    crawling
  });
});

app.post('/api/crawl', async (req, res) => {
  const start = req.body.start || '/';
  const depthLimit = parseInt(req.body.limit || '500', 10);
  // init
  discovered.clear();
  crawlQueue = [];
  discovered.add(start);
  crawlQueue.push(start);
  // run worker until discovered reaches limit
  await crawlWorker(depthLimit);
  res.json({ message: 'crawl started', discovered: discovered.size });
});

app.get('/api/sitemap', async (req, res) => {
  // simple sitemap XML from discovered set
  const urls = Array.from(discovered);
  const host = SITE_ROOT.replace(/\/$/, '');
  const items = urls.map(u => `<url><loc>${host}${u}</loc></url>`).join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n${items}\n</urlset>`;
  res.type('application/xml').send(xml);
});

app.get('/api/report', async (req, res) => {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url query param required (path starting with /)' });
  try {
    const html = await fetchHtml(url);
    const meta = extractMeta(html);
    res.json({ url, meta });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// quick index endpoint to simulate "request indexing" (note: real Google Indexing API needs auth)
app.post('/api/index', async (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(400).json({ error: 'url required' });
  // For now we return success and add to discovered
  const path = url.startsWith('/') ? url : '/' + url;
  discovered.add(path);
  res.json({ message: 'queued for indexing (simulated)', path });
});

app.listen(PORT, () => {
  console.log(`SEO Bot listening on port ${PORT}`);
});
