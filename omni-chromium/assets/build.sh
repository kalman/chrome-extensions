#!/bin/sh

for size in 16 19 38 48 128; do
  case `uname` in
    Darwin)
      sips -Z $size ../chromium.png --out chromium${size}.png
      ;;
    Linux)
      convert ../chromium.png -resize ${size}x${size} chromium${size}.png
      ;;
  esac
done
