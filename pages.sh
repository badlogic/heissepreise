#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Please provide a GitHub Pages repository URL, e.g. https://github.com/badlogic/badlogic.github.io"
  exit 1
fi

repoUrl=$1
pagesUrl="https://${repoUrl##*/}"

rm -rf pages
rm -rf tmp-data
mkdir tmp-data

npm install
node pages.js tmp-data $pagesUrl

git clone $repoUrl pages
cp site/* pages
cp tmp-data/latest-canonical.json pages
pushd pages
git add *
git commit -am "Updated $(date +'%Y-%m-%d')"
git push
popd

rm -rf tmp-data
rm -rf pages
