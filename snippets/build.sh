#!/bin/sh

SNIPPETS_URL="$1"
read -n1 -p "Snippets URL \"$SNIPPETS_URL\" ok? [y/N] " OK
if [ "$OK" != y ]; then
  exit 1
fi
echo

mkdir -p assets
cd assets
for size in 19 38 128; do
  case `uname` in
    Darwin)
      sips -Z $size ../icon.png --out icon_${size}_grey.png >/dev/null
      ;;
    Linux)
      convert ../icon.png -resize ${size}x${size} icon_${size}_grey.png
      ;;
  esac
done
cd ..

SRC="assets manifest.json *.js *.html"

rm -rf build
mkdir -p build
cp -a $SRC build
cd build

case `uname` in
  Darwin) SED_INPLACE="-i _" ;;
  Linux)  SED_INPLACE="-i" ;;
esac
for f in manifest.json *.js *.html; do
  sed $SED_INPLACE "s/\$(SNIPPETS_URL)/${SNIPPETS_URL}/g" "$f"
done

zip snippets.zip -r $SRC
mv snippets.zip ..
