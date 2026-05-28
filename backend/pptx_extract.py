#!/usr/bin/env python3
import html
import json
import re
import sys
import zipfile
from pathlib import Path


def xml_text(value):
    value = re.sub(r"<a:t[^>]*>", " ", value)
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value)
    return re.sub(r"\s+", " ", value).strip()


def main(path):
    deck = Path(path)
    result = {"text": "", "slideCount": 0, "fonts": [], "warning": False, "method": "pptx-zip"}
    try:
        with zipfile.ZipFile(deck) as archive:
            names = archive.namelist()
            slide_names = sorted(
                [name for name in names if re.match(r"ppt/slides/slide\d+\.xml$", name)],
                key=lambda item: int(re.search(r"slide(\d+)\.xml$", item).group(1)),
            )
            result["slideCount"] = len(slide_names)
            text_parts = []
            fonts = set()
            for name in slide_names:
                raw = archive.read(name).decode("utf-8", "ignore")
                text_parts.append(xml_text(raw))
                for font in re.findall(r'typeface="([^"]+)"', raw):
                    if font and not font.startswith("+"):
                        fonts.add(font)
            for name in names:
                if name.startswith("ppt/notesSlides/") and name.endswith(".xml"):
                    text_parts.append(xml_text(archive.read(name).decode("utf-8", "ignore")))
            result["text"] = " ".join(part for part in text_parts if part)
            result["fonts"] = sorted(fonts)[:20]
    except Exception as exc:
        result["warning"] = True
        result["method"] = "pptx-zip-fallback"
        result["error"] = str(exc)
    print(json.dumps(result))


if __name__ == "__main__":
    main(sys.argv[1])
