#!/bin/sh
# Rasterise public/og-image.svg into public/og-image.png (1200x630).
# qlmanage is the only rasteriser on the build machine; it forces a square
# viewport and sips crops from the centre, which is why the source centres the
# card in a 1200x1200 square. Run from the repository root.
set -e
tmp=$(mktemp -d)
qlmanage -t -s 1200 -o "$tmp" public/og-image.svg >/dev/null 2>&1
sips -c 630 1200 "$tmp/og-image.svg.png" --out public/og-image.png >/dev/null
sips -g pixelWidth -g pixelHeight public/og-image.png | tail -2
rm -rf "$tmp"
