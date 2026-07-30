#!/usr/bin/env python3
"""
UWAZI+ One Year Free  --  Operation Backpack KC, Aug 1 2026

Stamps a code into promo.html, renders 300 DPI print art, verifies the QR.

Usage:
    python3 make_cards.py            # card 1 only (print now)
    python3 make_cards.py --all      # all six
    python3 make_cards.py --proof    # add bleed/safe guide overlay
"""

import argparse, base64, csv, io, os, secrets, sys
from pathlib import Path

import segno
import cv2
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

# ---------------------------------------------------------------- config
BASE       = "https://uwazi.ai/redeem"       # CONFIRM: .ai vs .app  (Robert)
RULES_URL  = "uwazi.ai/backpack-rules"       # CONFIRM: must resolve before print
EXPIRY     = "Dec 31, 2026"                  # CONFIRM with Derek
CAMPAIGN   = "obkc20k"
PREFIX     = "OBKC-20K"

TEMPLATE   = Path("/home/claude/promo.html")
OUTDIR     = Path("/mnt/user-data/outputs")
WORKDIR    = Path("/home/claude/work")

# Unambiguous alphabet: no O/0, no I/1, no S/5, no B/8.
ALPHABET = "ACDEFGHJKLMNPQRTUVWXYZ234679"


def make_code(rng: secrets.SystemRandom) -> str:
    body = "".join(rng.choice(ALPHABET) for _ in range(4))
    return f"{PREFIX}-{body}"


def qr_data_uri(url: str) -> str:
    """High-EC QR as a crisp base64 PNG. No CDN, no JS -- travels with the file."""
    qr = segno.make(url, error="h")
    buf = io.BytesIO()
    qr.save(buf, kind="png", scale=20, border=2, dark="#040404", light="#F2F1EC")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()


def build_html(code: str, serial: int, proof: bool) -> tuple[Path, str]:
    url = f"{BASE}?code={code}&c={CAMPAIGN}"
    html = TEMPLATE.read_text(encoding="utf-8")
    for token, value in {
        "__CODE__":   code,
        "__QR__":     qr_data_uri(url),
        "__SERIAL__": str(serial),
        "__EXPIRY__": EXPIRY,
        "__RULES__":  RULES_URL,
    }.items():
        assert token in html, f"token {token} missing from template"
        html = html.replace(token, value)
    if proof:
        html = html.replace("<body>", '<body class="proof">')
    path = WORKDIR / f"card-{serial}.html"
    path.write_text(html, encoding="utf-8")
    return path, url


def render(page, path: Path, out_png: Path) -> tuple[int, int]:
    page.goto(path.as_uri())
    page.wait_for_timeout(1800)
    page.locator(".card").screenshot(path=str(out_png))
    im = Image.open(out_png)
    return im.size


def axis_is_painting(page, live_png: Path) -> bool:
    """document.fonts.check() returns true even when falling back, so compare the
    live headline against a forced-fallback render. Mean diff > 3 == real glyphs."""
    from PIL import ImageChops
    tmp = WORKDIR / "_fallback.png"
    page.add_style_tag(content=".display,.hero h1,.chip .ph"
                               "{font-family:'Arial Black',sans-serif !important;}")
    page.wait_for_timeout(500)
    page.locator(".card").screenshot(path=str(tmp))
    box = (80, 560, 1200, 1000)   # headline region
    a = Image.open(live_png).convert("L").crop(box)
    b = Image.open(tmp).convert("L").crop(box)
    return float(np.asarray(ImageChops.difference(a, b), dtype=float).mean()) > 3.0


def verify_qr(png: Path, expect: str) -> str:
    img = cv2.imread(str(png))
    decoded, _, _ = cv2.QRCodeDetector().detectAndDecode(img)
    if not decoded:
        return "UNREADABLE"
    return "OK" if decoded == expect else f"MISMATCH -> {decoded}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--proof", action="store_true")
    ap.add_argument("--code", help="pin an exact code instead of generating one")
    args = ap.parse_args()

    WORKDIR.mkdir(exist_ok=True)
    OUTDIR.mkdir(parents=True, exist_ok=True)

    if args.code:
        codes = [args.code.strip().upper()]
        args.all = False
    else:
        rng = secrets.SystemRandom()
        codes, seen = [], set()
        while len(codes) < 6:
            c = make_code(rng)
            if c not in seen:
                seen.add(c)
                codes.append(c)

    targets = list(enumerate(codes, 1)) if args.all else [(1, codes[0])]
    rows = []

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(
            viewport={"width": 520, "height": 700},
            device_scale_factor=3.125,          # 4.25in*96*3.125 = 1275px = 300 DPI
        )
        axis_ok = None
        for serial, code in targets:
            src, url = build_html(code, serial, args.proof)
            out = OUTDIR / f"uwazi-plus-card-{serial}-{code}.png"
            w, h = render(page, src, out)
            if axis_ok is None:
                axis_ok = axis_is_painting(page, out)
            status = verify_qr(out, url)
            rows.append({"serial": serial, "code": code, "url": url,
                         "file": out.name, "qr": status})
            print(f"card {serial}  {code}  {w}x{h}px  QR:{status}")
        browser.close()

    print(f"\nAXIS Extra Bold resolving: {axis_ok}"
          f"{'' if axis_ok else '   <-- fallback type in use, swap font before print'}")

    csv_path = OUTDIR / "uwazi-plus-codes.csv"
    with csv_path.open("w", newline="") as f:
        wtr = csv.DictWriter(f, fieldnames=["serial", "code", "url", "file", "qr"])
        wtr.writeheader()
        wtr.writerows(rows)
    print(f"codes -> {csv_path}")


if __name__ == "__main__":
    main()
