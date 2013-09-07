#!/bin/sh

cd assets
./build.sh
cd ..

zip browser-clock.zip -r assets background.js manifest.json
