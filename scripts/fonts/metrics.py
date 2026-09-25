#!/usr/bin/env python3
# Gera metrics.json (avanço de cada glifo em em) para o gen-assets.js medir
# texto sem depender de navegador. Rode de novo se trocar as fontes.
import json, pathlib
from fontTools.ttLib import TTFont

here = pathlib.Path(__file__).parent
out = {}
for f in sorted(here.glob('*.woff2')):
    font = TTFont(f)
    upm = font['head'].unitsPerEm
    cmap = font.getBestCmap()
    hmtx = font['hmtx']
    out[f.stem] = {chr(cp): round(hmtx[g][0] / upm, 4) for cp, g in cmap.items()}
(here / 'metrics.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
print('ok', ', '.join(f'{k}: {len(v)} glifos' for k, v in out.items()))
