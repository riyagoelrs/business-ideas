from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
OLD = '<script src="v9-overlay.js?v=9.1"></script>'
TAG = '<script src="v9-1-overlay.js?v=9.1"></script>'

text = INDEX.read_text().replace(OLD, "").replace(TAG, "")
text = text.replace("</body>", TAG + "</body>")
INDEX.write_text(text)
print("Injected syntax-checked v9.1 restaurant interaction layer")
