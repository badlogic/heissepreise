#!/bin/bash
repository_name=${GITHUB_REPOSITORY#*/}
if [[ $repository_name == *.github.io ]]; then
  echo "Name ends with github.io"
else
  echo "Name does not end with github.io, not generating pages"
  exit
fi

npm install
node pages.js

pushd docs
git add *
git commit -am "Updated $(date +'%Y-%m-%d')"
git push
popd
