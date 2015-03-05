#!/bin/sh

cd assets
./build.sh
cd ..

zip comment-protector.zip -r assets manifest.json script.js
