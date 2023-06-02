#!/bin/bash
repository_name=${GITHUB_REPOSITORY#*/}
if [[ $repository_name == *.github.io ]]; then
  echo "Name ends with github.io"
else
  echo "Name does not end with github.io, not generating pages"
  # exit
fi

rm -rf tmp-data
mkdir tmp-data
mkdir -p docs
cp docs/latest-canonical.json tmp-data

npm install
node pages.js tmp-data
node migrate tmp-data ".json.br" ".json"
cp tmp-data/latest-canonical* docs

cp site/* docs
rm docs/latest-canonical.json.*
pushd docs
git add *
git commit -am "Updated $(date +'%Y-%m-%d')"
git push
popd

rm -rf tmp-data
