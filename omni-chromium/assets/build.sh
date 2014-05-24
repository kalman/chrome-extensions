#!/bin/sh

for size in 16 19 38 48 128; do
  sips -Z $size ../chromium.png --out chromium${size}.png
done
