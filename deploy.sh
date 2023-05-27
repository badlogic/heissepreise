#!/bin/bash
directory="site"
if [ ! -d "$directory" ]; then
    echo "Directory does not exist."
    exit 1
fi

cd "$directory" || exit 1
find . -type f -name "*.html" -print0 | while IFS= read -r -d $'\0' file; do
    sed -i 's/href="index\.html"/href="index-old.html"/g' "$file"
done
echo "Replacement complete."
mv site/index.html site/index-old.html
mv site/index-new.html site/index.html