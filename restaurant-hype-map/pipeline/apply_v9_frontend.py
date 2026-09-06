from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
TAGS = [
    '<script src="v9-overlay.js?v=9.1"></script>',
    '<script src="v9-1-overlay.js?v=9.1"></script>',
    '<script src="v9-1-overlay.js?v=10"></script>',
    '<script src="v9-1-overlay.js?v=11"></script>',
    '<script src="v11-addon.js?v=11"></script>',
]
BASE = '<script src="v9-1-overlay.js?v=11"></script>'
ADDON = '<script src="v11-addon.js?v=11"></script>'
text = INDEX.read_text()
for tag in TAGS:
    text = text.replace(tag, "")
text = text.replace("</body>", BASE + ADDON + "</body>")
INDEX.write_text(text)
print("Injected v11 aggregate restaurant interaction layer")
