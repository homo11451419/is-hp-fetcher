import { chromium } from 'playwright';
import fs from 'node:fs/promises';

const URL = 'https://linux.do/u/is_hp/summary.json';
const OUT = 'is_hp.json';
const MAX_RETRIES = 3;

async function run() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36',
      viewport: { width: 1366, height: 768 },
    });
    const page = await context.newPage();

    try {
      const resp = await page.goto(URL, { waitUntil: 'networkidle', timeout: 60_000 });
      if (!resp || !resp.ok()) {
        throw new Error(`Request failed${resp ? ` with HTTP ${resp.status()}` : ''}`);
      }
      const body = await resp.text();
      await fs.writeFile(OUT, body);
      console.log(`Saved ${OUT} (${body.length} bytes)`);
      await browser.close();
      return;
    } catch (e) {
      console.error(`Attempt ${attempt} failed:`, e?.message || e);
      try { await browser.close(); } catch {}
      if (attempt === MAX_RETRIES) throw e;
      const backoff = 5000 * attempt;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
