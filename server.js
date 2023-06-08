const express = require('express');
const cheerio = require('cheerio');
const axios = require('axios');
const cors = require('cors');
const morgan = require('morgan');
const fs = require('fs');

const app = express();

// Enable CORS
app.use(cors());

// Create a write stream for logging
const accessLogStream = fs.createWriteStream('access.log', { flags: 'a' });

// Use morgan middleware for logging
app.use(morgan('combined', { stream: accessLogStream }));

// Enable node-cache
const NodeCache = require('node-cache');
const cache = new NodeCache();

// Define your API key
const apiKey = '3d9144c0858edd33e109dd4334ef1282d04342792749975c68960159c39c6973';

// Middleware to check API key
const validateApiKey = (req, res, next) => {
  const providedApiKey = req.headers['x-api-key'];

  if (providedApiKey && providedApiKey === apiKey) {
    next();
  } else {
    res.status(401).json({ error: 'Invalid API key.' });
  }
};

// Apply the API key validation middleware to the /ogproxy route
app.use('/ogproxy', validateApiKey);

app.get('/ogproxy', async (req, res) => {
  const url = req.query.url;

  // Check if the data is available in the cache
  const cachedData = cache.get(url);
  if (cachedData) {
    return res.json(cachedData);
  }

  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);

    const metadata = {
      title: $('meta[property="og:title"]').attr('content'),
      description: $('meta[property="og:description"]').attr('content'),
      image: $('meta[property="og:image"]').attr('content'),
      url: $('meta[property="og:url"]').attr('content'),
    };

    // Store the data in cache
    cache.set(url, metadata);

    res.json(metadata);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch OpenGraph metadata.' });
  }
});

const port = 2000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
