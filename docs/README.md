# GlobalArt Ecosystem Documentation

Professional documentation site for the GlobalArt Ecosystem built with [Docusaurus](https://docusaurus.io/).

## Development

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## Structure

- `/content/` - Documentation content in MDX format
- `/src/` - Custom React components and styling
- `/static/` - Static assets (images, icons, etc.)

## Contributing

When adding new documentation:

1. Create MDX files in the appropriate `/content/` directory
2. Update `sidebars.ts` if adding new sections
3. Follow the existing style and structure conventions

## Deployment

The site is automatically deployed to GitHub Pages on push to the main branch.
