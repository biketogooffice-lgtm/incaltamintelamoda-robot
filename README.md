SEO Bot - Advanced version (Variant B)
=====================================

This project is an advanced SEO bot intended to run on Vercel (serverless Node.js).
It provides endpoints to crawl the website, generate a simple sitemap, and analyze pages.

Included endpoints:
- GET /api/status       -> health + crawl stats
- POST /api/crawl       -> start a crawl (JSON body: { "start": "/", "limit": 500 })
- GET /api/sitemap      -> returns a simple sitemap.xml built from discovered URLs
- GET /api/report?url=  -> returns meta tags for a given path (e.g. /produs/p1)
- POST /api/index       -> simulate indexing a URL (adds it to discovered set)

How to deploy on Vercel
-----------------------
1. Create a Vercel project and link your GitHub repository, or upload this project.
2. Add environment variables (in Vercel dashboard or via .env):
   - OPENAI_API_KEY (optional)
   - SITE_ROOT (e.g. https://www.incaltamintelamoda.ro)
   - PORT (optional)
3. Deploy. Use the dashboard to view logs and invoke the endpoints.

Notes
-----
- This bot stores discovered URLs in memory (process memory). For long-term use, connect a persistent DB.
- The 'index' endpoint is a simulation; interfacing with Google Indexing API requires OAuth and approved access.
- Crawl politely: adjust concurrency or add delays if you hit rate limits.
