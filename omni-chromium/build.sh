#!/bin/sh

cd assets
./build.sh
cd ..

zip omni-chromium.zip -r assets background.js hidebanner.css manifest.json
