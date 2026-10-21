"""Converte history.json (histórico da apuração presidencial) em CSV.

Uso (a partir da raiz do repositório):
  python src/converter_historico.py [data/raw/history.json] [data/processed]
Gera:
  apuracao_longo.csv  - uma linha por (snapshot, candidato)
  apuracao_largo.csv  - uma linha por snapshot, colunas pct_<CAND> e votos_<CAND>
"""
import csv
import json
import os
import sys


def num(v):
    # O TSE usa vírgula decimal e às vezes manda número como string
    if v is None or v == "":
        return None
    return float(str(v).replace(".", "").replace(",", ".")) if "," in str(v) else float(v)


def main(path="data/raw/history.json", out_dir="data/processed"):
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    os.makedirs(out_dir, exist_ok=True)

    nomes = {c["CD_CANDIDATO"]: (c["NM_CAND_ABREV"], c["ME_PARTIDO"]) for c in d["CANDIDATOS"]}
    ordem = [c["CD_CANDIDATO"] for c in d["CANDIDATOS"]]

    # Ordena por horário e descarta snapshots repetidos
    mapas = sorted(d["MAPAS"], key=lambda m: m["DT_TOTALIZACAO"])
    vistos, unicos = set(), []
    for m in mapas:
        if m["DT_TOTALIZACAO"] not in vistos:
            vistos.add(m["DT_TOTALIZACAO"])
            unicos.append(m)

    base_cols = ["datetime", "pct_urnas_apuradas", "pct_brancos", "pct_nulos", "pct_abstencao", "situacao"]
    longo, largo = [], []
    for m in unicos:
        base = {
            "datetime": m["DT_TOTALIZACAO"],
            "pct_urnas_apuradas": num(m["PC_URNAS_APUR"]),
            "pct_brancos": num(m.get("PC_BRANCOS")),
            "pct_nulos": num(m.get("PC_NULOS")),
            "pct_abstencao": num(m.get("PC_ABSTEN")),
            "situacao": m.get("CT_APURA"),
        }
        linha = dict(base)
        for c in m["CANDIDATOS"]:
            nome, partido = nomes.get(c["n"], (c["n"], ""))
            votos, pct = int(num(c["vap"])), num(c["pvap"])
            longo.append({**base, "numero": c["n"], "candidato": nome, "partido": partido,
                          "votos": votos, "pct_votos_validos": pct})
            linha[f"votos_{nome}"] = votos
            linha[f"pct_{nome}"] = pct
        largo.append(linha)

    with open(os.path.join(out_dir, "apuracao_longo.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=base_cols + ["numero", "candidato", "partido", "votos", "pct_votos_validos"])
        w.writeheader()
        w.writerows(longo)

    cand_cols = []
    for cd in ordem:
        nome = nomes[cd][0]
        cand_cols += [f"pct_{nome}", f"votos_{nome}"]
    with open(os.path.join(out_dir, "apuracao_largo.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=base_cols + cand_cols)
        w.writeheader()
        w.writerows(largo)

    print(f"{len(unicos)} snapshots ({len(d['MAPAS'])} no JSON), {len(ordem)} candidatos")
    print("apuracao_longo.csv:", len(longo), "linhas | apuracao_largo.csv:", len(largo), "linhas")


if __name__ == "__main__":
    main(*sys.argv[1:])
