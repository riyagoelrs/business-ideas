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
    "mangement": "management",
    "compnay": "company",
}

# Standardise verbose financial phrases to banking-style abbreviations
FINANCE_FIXES = [
    (r"\$\s?(\d+(?:\.\d+)?)\s+million\b", r"$\1M"),
    (r"\$\s?(\d+(?:\.\d+)?)\s+billion\b", r"$\1B"),
    (r"\$\s?(\d+(?:\.\d+)?)\s?mm\b", r"$\1M"),
    (r"\$\s?(\d+(?:\.\d+)?)\s?bn\b", r"$\1B"),
    (r"(\d+(?:\.\d+)?)\s+percent\b", r"\1%"),
    (r"(\d+(?:\.\d+)?)\s+times\b", r"\1x"),
    (r"\bFY\s+(\d{2,4})\b", r"FY\1"),
]


def fix_text_nodes(raw):
    """Apply fixes to the plain text inside <a:t>...</a:t> nodes only."""
    def fix_node(match):
        text = match.group(1)
        for wrong, right in SPELLING_FIXES.items():
            text = text.replace(wrong, right)
        for pattern, replacement in FINANCE_FIXES:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        # Collapse double spaces
        text = re.sub(r"  +", " ", text)
        return f"<a:t>{text}</a:t>"
    return re.sub(r"<a:t>(.*?)</a:t>", fix_node, raw, flags=re.DOTALL)


def fix_xml(raw, style_system):
    raw = fix_text_nodes(raw)
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
