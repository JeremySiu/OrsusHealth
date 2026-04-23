import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

let browserInstance = null;
const APP_API_KEY = process.env.APP_API_KEY || '';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
};

const getBrowser = async () => {
  if (browserInstance) return browserInstance;

  browserInstance = await puppeteer.launch({
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
    headless: 'shell',
    defaultViewport: {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1,
    },
  });

  return browserInstance;
};

export const handler = async (event) => {
  let page = null;

  try {
    if (event.requestContext?.http?.method === 'OPTIONS') {
      return {
        statusCode: 204,
        headers: CORS_HEADERS,
      };
    }

    const headers = event.headers || {};
    const providedApiKey = headers['x-api-key'] || headers['X-Api-Key'] || headers['X-API-Key'];

    if (!APP_API_KEY || providedApiKey !== APP_API_KEY) {
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

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="report.pdf"',
        ...CORS_HEADERS,
      },
      body: pdf.toString('base64'),
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
