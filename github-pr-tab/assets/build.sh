#!/bin/sh

for size in 16 19 38 48 128; do
  case `uname` in
    Darwin)
      sips -Z $size ../icon.png --out icon${size}.png
      ;;
    Linux)
      convert ../icon.png -resize ${size}x${size} icon${size}.png
      ;;
  esac
done
