#!/bin/sh

cd assets
./build.sh
cd ..

zip gen-hider.zip -r assets manifest.json *.js
