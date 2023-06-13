const express = require('express');
const ogs = require('open-graph-scraper');
const cors = require('cors');
const { URL } = require('url');
const cache = require('memory-cache');
const axios = require('axios');
const { MetaParser } = require('meta-parser');
const cheerio = require('cheerio');
const path = require('path');
const app = express();
const port = 2000;

const apiKey = 'YOUR_API_KEY_HERE';

app.use(cors({ origin: 'FUL_FQDN_OF_YOUR_ORIGIN_HERE' }));

app.get('/ogproxy', async (req, res) => {
  let { url } = req.query;
  const requestApiKey = req.headers['x-api-key'];

  if (requestApiKey !== apiKey) {
    return res.status(401).send('Unauthorized');
  }

  if (!url) {
    return res.status(400).send('Missing URL parameter');
  }
  if (!url.startsWith('http')) {
    url = new URL(url, `${req.protocol}://${req.get('host')}`).href;
  }

  const cachedResult = cache.get(url);
  if (cachedResult) {
    return res.json(cachedResult);
  }

  const options = { url };

  try {
    const results = await ogs(options);

    if (results.data && results.data.ogImage && results.data.ogImage.url) {
      const faviconUrl = new URL(results.data.ogImage.url, url).href;
      results.data.faviconUrl = faviconUrl;

      // Fetch the website content
      const websiteContent = await axios.get(url);

      // Create an instance of MetaParser and parse the website content
      const parser = new MetaParser(url, websiteContent.data);
      const metaProperties = parser.getMetaProperties();

      const html = websiteContent.data;
      const $ = cheerio.load(html);

      const metadata = {
        site: $('meta[property="og:site_name"]').attr('content') || '',
        title: $('meta[property="og:title"]').attr('content') || '',
        description: $('meta[property="og:description"]').attr('content') || '',
        image: $('meta[property="og:image"]').attr('content') || '',
        url: $('meta[property="og:url"]').attr('content') || '',
        favicon: $('link[rel="icon"]').attr('href') || '',
      };


// Resolve the full URL for the favicon
if (metadata.favicon && !metadata.favicon.startsWith('http')) {
  const base = new URL(url);
  const resolvedFaviconUrl = new URL(metadata.favicon, base).href;
  metadata.favicon = resolvedFaviconUrl;
}

// Handle favicon request separately
try {
  if (metadata.favicon) {
    const faviconResponse = await axios.get(metadata.favicon, { responseType: 'arraybuffer' });
    const faviconData = faviconResponse.data.toString('base64');
    metadata.favicon = `data:${faviconResponse.headers['content-type']};base64,${faviconData}`;
  }
} catch (faviconError) {
  console.error('Failed to fetch favicon:', faviconError.message);
}

// Add the meta properties to the results
results.data.metaProperties = metaProperties;

// Update faviconUrl explicitly in results.data
results.data.faviconUrl = metadata.favicon; // Use metadata.favicon instead of faviconUrl

    }
    cache.put(url, results);
    res.json(results);
  } catch (error) {
    res.status(500).send('Error scraping Open Graph data');
  }
});
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
