from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
TAG = '<script src="v9-overlay.js?v=9.1"></script>'

text = INDEX.read_text()
if TAG not in text:
    text = text.replace("</body>", TAG + "</body>")
    INDEX.write_text(text)
    print("Injected v9 restaurant interaction layer")
else:
    print("v9 interaction layer already present")
