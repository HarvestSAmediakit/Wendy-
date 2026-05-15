---
name: firecrawl
description: Use Firecrawl to search, scrape, and extract structured data from the web.
---

# Firecrawl Skill

This skill allows the agent to interact with the web using Firecrawl's advanced scraping and searching capabilities.

## Capabilities

1. **Scrape**: Convert any URL into clean markdown or structured data.
2. **Search**: Search the web and get back the most relevant URLs for a query.
3. **Crawl**: Follow links to explore entire websites.
4. **Map**: Generate a list of URLs for a domain.

## Usage in this App

The app uses Firecrawl in `src/services/leadIntelligenceService.ts` and `src/services/magazineScraperService.ts` to discover B2B leads from competitor sites.

### Environment Variables
- `FIRECRAWL_API_KEY`: Required for all operations.

### Example Operations
```typescript
import FirecrawlApp from '@mendable/firecrawl-js';

const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// Scrape a page
const scrapeResult = await app.scrapeUrl('https://example.com', {
  formats: ['markdown', 'html']
});

// Search for pages
const searchResult = await app.search('latest trends in agriculture advertising');
```
