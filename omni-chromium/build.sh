#!/bin/sh

cd assets
./build.sh
cd ..

zip omni-chromium.zip -r assets *.css *.js manifest.json
