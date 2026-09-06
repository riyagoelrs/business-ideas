from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
OLD1 = '<script src="v9-overlay.js?v=9.1"></script>'
OLD2 = '<script src="v9-1-overlay.js?v=9.1"></script>'
TAG = '<script src="v9-1-overlay.js?v=10"></script>'

text = INDEX.read_text().replace(OLD1, "").replace(OLD2, "").replace(TAG, "")
text = text.replace("</body>", TAG + "</body>")
INDEX.write_text(text)
print("Injected v10 restaurant interaction layer")
