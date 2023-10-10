const express = require('express');
const axios = require('axios');
const lodash = require('lodash');

const app = express();
const PORT = 3000;

let blogs; // Variable to store fetched blogs

// Fetch data from the third-party API when the server starts
async function fetchData() {
  try {
    const response = await axios.get('https://intent-kit-16.hasura.app/api/rest/blogs', {
      headers: {
        'x-hasura-admin-secret': '32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6'
      }
    });
    blogs = response.data;
    console.log(`Retrieved ${blogs.blogs.length} blogs.`);
  } catch (error) {
    console.error('Error fetching blogs:', error.message);
    throw new Error('Error fetching blogs. Please try again later.');
  }
}

// Middleware to fetch data when the server starts
app.use(async (req, res, next) => {
  try {
    if (!blogs) {
      await fetchData();
    }
    next();
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Middleware for data retrieval and analysis with caching
const cachedBlogStats = lodash.memoize(async () => {
  try {
    console.log('Checking cache for blog stats...');
    const start = Date.now();
    const result = await blogs;
    const end = Date.now();
    console.log(`Cache check took ${end - start} ms.`);
    return result;
  } catch (error) {
    console.error(error.message);
    throw new Error('Error getting blog stats. Please try again later.');
  }
}, () => 'cachedKey');

app.get('/api/blog-stats', async (req, res) => {
  try {
    console.log('Fetching blog stats...');
    const start = Date.now();
    const cachedResult = await cachedBlogStats();
    const end = Date.now();
    console.log(`Blog stats request took ${end - start} ms.`);
    res.json(cachedResult);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Blog search endpoint with POST method and caching
const cachedSearchResults = lodash.memoize(async (query) => {
  try {
    console.log(`Checking cache for search results with query: "${query}"...`);
    const start = Date.now();

    if (!query) {
      throw new Error('Query parameter is missing.');
    }

    if (!blogs) {
      await fetchData();
    }

    const searchResults = lodash.filter(blogs.blogs, blog =>
      blog.title && lodash.includes(blog.title.toLowerCase(), query.toLowerCase())
    );

    const end = Date.now();
    console.log(`Cache check took ${end - start} ms.`);
    return { results: searchResults };
  } catch (error) {
    console.error(error.message);
    throw new Error('Error searching blogs. Please try again later.');
  }
}, (query) => query);

//Post method api to run it with passing of parameters
app.post('/api/blog-search', express.json(), async (req, res) => {
  try {
    const { query } = req.body;
    console.log(`Fetching search results with query: "${query}"...`);
    const start = Date.now();
    const cachedResult = await cachedSearchResults(query);
    const end = Date.now();
    console.log(`Search results request took ${end - start} ms.`);
    res.json(cachedResult);
  } catch (error) {
    console.error(error.message);
    res.status(400).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
