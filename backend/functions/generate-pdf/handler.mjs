import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'node:fs';

let browserInstance = null;
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
};

const LOCAL_BROWSER_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const resolveLaunchOptions = async () => {
  const isLambdaRuntime = Boolean(process.env.AWS_EXECUTION_ENV || process.env.LAMBDA_TASK_ROOT);

  if (!isLambdaRuntime) {
    const localExecutablePath = LOCAL_BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate));

    if (localExecutablePath) {
      return {
        args: ['--disable-gpu', '--no-first-run'],
        executablePath: localExecutablePath,
        headless: true,
      };
    }
  }

  return {
    args: [
      ...chromium.args,
      '--no-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-setuid-sandbox',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-sync',
      '--no-first-run',
    ],
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    defaultViewport: chromium.defaultViewport,
  };
};

const getBrowser = async () => {
  if (browserInstance) return browserInstance;

  browserInstance = await puppeteer.launch(await resolveLaunchOptions());

  return browserInstance;
};

export const handler = async (event) => {
  let page = null;

  try {
    const appApiKey = process.env.APP_API_KEY || '';

    if (event.requestContext?.http?.method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: CORS_HEADERS,
      };
    }

    const headers = event.headers || {};
    const providedApiKey = headers['x-api-key'] || headers['X-Api-Key'] || headers['X-API-Key'];

    if (!appApiKey || providedApiKey !== appApiKey) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
        body: JSON.stringify({ error: 'Forbidden' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { html } = body;

    if (!html || typeof html !== 'string') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
        body: JSON.stringify({ error: 'Missing or invalid html field in request body' }),
      };
    }

    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['media', 'websocket'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
    });

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '1in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });
    const pdfBuffer = Buffer.from(pdf);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"',
        ...CORS_HEADERS,
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error('PDF generation error:', err);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        ...CORS_HEADERS,
      },
      body: JSON.stringify({ error: 'PDF generation failed', detail: err.message }),
    };
  } finally {
    if (page) await page.close();
  }
};
