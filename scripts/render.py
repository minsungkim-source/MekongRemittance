#!/usr/bin/env python3
"""Assemble the single-file page: template + dataset + app, no runtime fetches."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tpl = open(f"{ROOT}/src/template.html", encoding="utf-8").read()
app = open(f"{ROOT}/src/app.js", encoding="utf-8").read()
data = open(f"{ROOT}/data/build/dataset.json", encoding="utf-8").read()

# the pipeline writes ASCII "--" to stay encoding-safe; the page shows real dashes
data = re.sub(r'(?<=[^-\\])--(?=[^->])', '\u2014', data)

for token, payload in (("__DATA__", data), ("__APP__", app)):
    if token not in tpl:
        sys.exit(f"template is missing {token}")
    tpl = tpl.replace(token, payload)

# a literal </script> inside the payload would end the block early
assert tpl.count("</script>") == 1, "payload contains a script terminator"

os.makedirs(f"{ROOT}/dist", exist_ok=True)
# GitHub Pages serves the repository root, so the page is written there as well
# as into dist/ -- keeping one build step means the published copy cannot go stale
out = f"{ROOT}/index.html"
open(out, "w", encoding="utf-8").write(tpl)
open(f"{ROOT}/dist/index.html", "w", encoding="utf-8").write(tpl)
print(f"{out}  {os.path.getsize(out) / 1024:.0f} KB")

# Artifact variant: the host supplies the document skeleton and its own charset
# and viewport, so ship head contents + body contents with no wrapper of our own.
head = tpl[tpl.index("<head>") + 6:tpl.index("</head>")]
body = tpl[tpl.index("<body>") + 6:tpl.rindex("</body>")]
head = re.sub(r'<meta charset[^>]*>\s*', '', head)
head = re.sub(r'<meta name="viewport"[^>]*>\s*', '', head)
art = f"{ROOT}/dist/artifact.html"
open(art, "w", encoding="utf-8").write(head.strip() + "\n" + body.strip() + "\n")
print(f"{art}  {os.path.getsize(art) / 1024:.0f} KB")
