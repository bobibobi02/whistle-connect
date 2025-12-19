# PWA Icons

This directory should contain app icons for the Progressive Web App.

## Required Sizes

Create icons in the following sizes:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Generating Icons

1. Create a high-resolution source icon (at least 512x512, preferably 1024x1024)
2. Use one of these tools to generate all sizes:

### Option 1: PWA Asset Generator (CLI)
```bash
npx pwa-asset-generator ./source-icon.png ./public/icons --manifest ./public/manifest.json
```

### Option 2: Online Tools
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [Favicon.io](https://favicon.io/)
- [App Icon Generator](https://www.appicon.co/)

## Design Guidelines

- Use the Whistle brand color (#ff5c8d) as the primary color
- Ensure the icon is recognizable at small sizes
- Use a simple, bold design
- Include some padding for maskable icon support
