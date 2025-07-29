#!/bin/bash

echo "🔨 Building frontend for GitHub Pages..."

cd frontend

# Build with production settings
NODE_ENV=production npm run build

echo "✅ Build complete! Check the dist folder:"
ls -la dist/

echo ""
echo "📁 Build output:"
echo "- HTML: dist/index.html"
echo "- Assets: dist/assets/"
echo ""
echo "🌐 To test locally, run:"
echo "cd frontend && npx serve dist -p 5000"
echo ""
echo "Then open: http://localhost:5000/csv-parser-poc/"