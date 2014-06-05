#!/bin/sh

mkdir -p assets
cd assets
for size in 19 38 128; do
  convert ../icon.png -resize ${size}x${size} icon_${size}_grey.png
done
cd ..

SRC="assets manifest.json *.js *.html"

rm -r build
mkdir -p build
cp -a $SRC build
cd build

read -p 'Snippets URL? ' SNIPPETS_URL
for f in manifest.json *.js *.html; do
  sed -i "s/\$(SNIPPETS_URL)/${SNIPPETS_URL}/g" "$f"
done

zip snippets.zip -r $SRC
mv snippets.zip ..
