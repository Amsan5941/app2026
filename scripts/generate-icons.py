#!/usr/bin/env python3
import os
import shutil

from PIL import Image

SRC = "/Users/amsan/app2026/assets/images/ForgeFit logo.png"
OUT = "/Users/amsan/app2026/assets/images"
WHITE = (248, 248, 250)

src = Image.open(SRC).convert("RGBA")

def rgb(size, name):
    r = src.resize((size, size), Image.LANCZOS)
    flat = Image.new("RGB", (size, size), WHITE)
    flat.paste(r, (0, 0), r)
    flat.save(f"{OUT}/{name}", "PNG")
    print(f"  ok  {name} ({size}x{size})")

def rgba(size, name):
    r = src.resize((size, size), Image.LANCZOS)
    r.save(f"{OUT}/{name}", "PNG")
    print(f"  ok  {name} ({size}x{size})")

def mono(size, name):
    r = src.resize((size, size), Image.LANCZOS)
    m = Image.new("RGBA", (size, size), (0,0,0,0))
    px, out = r.load(), m.load()
    for y in range(size):
        for x in range(size):
            rr,g,b,a = px[x,y]
            if a > 30:
                out[x,y] = (255,255,255,a)
    m.save(f"{OUT}/{name}", "PNG")
    print(f"  ok  {name} ({size}x{size})")

rgb(1024, "icon.png")
rgb(1024, "splash-icon.png")
rgba(512,  "android-icon-foreground.png")

bg = Image.new("RGB", (512,512), WHITE)
bg.save(f"{OUT}/android-icon-background.png", "PNG")
print("  ok  android-icon-background.png (512x512)")

mono(432, "android-icon-monochrome.png")
rgb(48,   "favicon.png")

print("\nDone — all icons set to ForgeFit logo.png")
