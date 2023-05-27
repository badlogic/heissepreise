#!/bin/bash
dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
pushd $dir > /dev/null
pushd site
find . -type f -name "*.html" -print0 | while IFS= read -r -d $'\0' file; do
    sed -i 's/href="index\.html"/href="index-old.html"/g' "$file"
done
echo "Replacement complete."
popd
mv site/index.html site/index-old.html
mv site/index-new.html site/index.html