export default {
  canonicalOrigin: "https://www.example.com",
  sitemapUrl: "https://www.example.com/sitemap.xml",
  trailingSlash: "always",
  alternateOrigins: [
    "https://example.com",
    "http://example.com",
    "http://www.example.com"
  ],
  probes: [
    {
      source: "https://www.example.com/legacy-page/?gfl_redirect_probe=1",
      destination: "https://www.example.com/replacement/?gfl_redirect_probe=1"
    }
  ]
};
