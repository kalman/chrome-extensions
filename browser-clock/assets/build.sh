#!/bin/sh

for size in 16 19 38 48 128; do
  sips -Z $size ../infinity.png --out infinity${size}.png
done
