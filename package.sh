#!/bin/bash
set -e
npm install
rm -rf dist
mkdir -p dist
mkdir -p dist/data
cp -r site dist
npx pkg package.json
zip -r heissepreise.zip dist/