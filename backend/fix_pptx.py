#!/usr/bin/env python3
import re
import sys
import zipfile
from pathlib import Path


SPELLING_FIXES = {
    "Revnue": "Revenue",
    "revnue": "revenue",
    "teh": "the",
    "adress": "address",
    "recieve": "receive",
    "occured": "occurred",
    "seperate": "separate",
    "definately": "definitely",
}


def fix_xml(raw, style_system):
    for wrong, right in SPELLING_FIXES.items():
        raw = raw.replace(wrong, right)
    raw = re.sub(r'<a:latin typeface="[^"]*"', f'<a:latin typeface="{style_system}"', raw)
    raw = re.sub(r'<a:ea typeface="[^"]*"', f'<a:ea typeface="{style_system}"', raw)
    raw = re.sub(r'<a:cs typeface="[^"]*"', f'<a:cs typeface="{style_system}"', raw)
    return raw


def main(source, output, style_system="Inter"):
    source_path = Path(source)
    output_path = Path(output)
    changed = 0
    with zipfile.ZipFile(source_path, "r") as src, zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as dst:
        for info in src.infolist():
            data = src.read(info.filename)
            if info.filename.startswith("ppt/slides/") and info.filename.endswith(".xml"):
                raw = data.decode("utf-8", "ignore")
                fixed = fix_xml(raw, style_system)
                if fixed != raw:
                    changed += 1
                data = fixed.encode("utf-8")
            dst.writestr(info, data)
    print(changed)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else "Inter")
