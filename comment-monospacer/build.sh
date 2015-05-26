#!/bin/sh

cd assets
./build.sh
cd ..

zip comment-monospace.zip -r assets manifest.json style.css
