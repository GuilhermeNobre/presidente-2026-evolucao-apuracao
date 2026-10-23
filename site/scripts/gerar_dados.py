"""Gera js/dados.js a partir de data/processed/apuracao_largo.csv.

Reproduz a preparação do notebook regressao_linear.ipynb (capítulo 11):
percentuais recalculados sobre os votos válidos, blocos da 3ª via e remoção
de snapshots com o mesmo % de urnas apuradas (fica o último).

Uso (da pasta site/):  python scripts/gerar_dados.py
Só usa a biblioteca padrão do Python 3.
"""
import csv
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CSV = RAIZ.parent / "data" / "processed" / "apuracao_largo.csv"
SAIDA = RAIZ / "js" / "dados.js"

FINALISTAS = {"flavio": "FLAVIO BOLSONARO", "lula": "LULA"}
TERCEIRA_VIA = {
    "cury": ("Augusto Cury", ["ESCRITOR AUGUSTO CURY"]),
    "renan": ("Renan Santos", ["RENAN SANTOS"]),
    "caiado": ("Caiado", ["RONALDO CAIADO"]),
    "zema": ("Zema", ["ZEMA"]),
}


def numero(v):
    return float(v) if v not in ("", None) else 0.0


def ajustar_mmq(x, y):
    """Mínimos quadrados da seção 4 do notebook. Devolve (beta0, beta1, R²)."""
    n = len(x)
    xm, ym = sum(x) / n, sum(y) / n
    b1 = sum((a - xm) * (b - ym) for a, b in zip(x, y)) / sum((a - xm) ** 2 for a in x)
    b0 = ym - b1 * xm
    sqr = sum((b - (b0 + b1 * a)) ** 2 for a, b in zip(x, y))
    sqt = sum((b - ym) ** 2 for b in y)
    return b0, b1, 1 - sqr / sqt


with open(CSV, encoding="utf-8") as f:
    linhas = sorted(csv.DictReader(f), key=lambda r: r["datetime"])

candidatos = [c.removeprefix("votos_") for c in linhas[0] if c.startswith("votos_")]
usados = set(FINALISTAS.values()) | {c for _, cs in TERCEIRA_VIA.values() for c in cs}
grupos = {k: cs for k, (_, cs) in TERCEIRA_VIA.items()}
grupos["demais"] = [c for c in candidatos if c not in usados]
series = {**{k: [v] for k, v in FINALISTAS.items()}, **grupos}

por_x = {}
for r in linhas:
    votos = {c: numero(r[f"votos_{c}"]) for c in candidatos}
    validos = sum(votos.values())
    ponto = {"x": float(r["pct_urnas_apuradas"])}
    for k, cs in series.items():
        ponto[k] = 100 * sum(votos[c] for c in cs) / validos
    por_x[ponto["x"]] = (ponto, votos, validos, r["datetime"])  # fica o último

pontos = [p for p, *_ in sorted(por_x.values(), key=lambda t: t[3])]
_, votos_final, validos_final, dt_final = list(por_x.values())[-1]

nomes = {"flavio": "Flávio Bolsonaro", "lula": "Lula",
         **{k: n for k, (n, _) in TERCEIRA_VIA.items()}, "demais": "Demais"}
retas = {}
for k in series:
    b0, b1, r2 = ajustar_mmq([p["x"] for p in pontos], [p[k] for p in pontos])
    retas[k] = {"beta0": round(b0, 6), "beta1": round(b1, 8), "r2": round(r2, 4)}

dados = {
    "fonte": "TSE via g1 · apuracao_largo.csv",
    "snapshots": len(linhas),
    "atualizadoEm": dt_final,
    "validosFinal": int(validos_final),
    "nomes": nomes,
    "demais": [c.title() for c in grupos["demais"]],
    "final": {k: {"votos": int(sum(votos_final[c] for c in cs)),
                  "pct": round(100 * sum(votos_final[c] for c in cs) / validos_final, 6)}
              for k, cs in series.items()},
    "retas100": retas,
    "chaves": list(series),
    "pontos": [[round(p["x"], 2)] + [round(p[k], 4) for k in series] for p in pontos],
}

SAIDA.write_text(
    "// Gerado por scripts/gerar_dados.py. Não edite à mão.\n"
    "// pontos: [x, " + ", ".join(series) + "] em % dos votos válidos\n"
    "window.DADOS = " + json.dumps(dados, ensure_ascii=False, separators=(",", ":")) + ";\n",
    encoding="utf-8",
)
print(f"{len(pontos)} pontos -> {SAIDA}")
for k, r in retas.items():
    print(f"{k:7} ŷ = {r['beta0']:.4f} {r['beta1']:+.6f}·x  ->  {r['beta0'] + 100 * r['beta1']:.2f}%")
