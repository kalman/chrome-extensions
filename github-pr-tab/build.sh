#!/bin/sh

cd assets
./build.sh
cd ..

zip github-pr-tab.zip -r assets manifest.json script.js
