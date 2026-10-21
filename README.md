# Evolução da apuração: Presidente 2026 (1º turno)

Série histórica da apuração da eleição presidencial brasileira de 2026 (1º turno, 4 de outubro de 2026). Cada registro é uma atualização da totalização, com o percentual de urnas apuradas e os votos e percentuais de cada candidato naquele momento. O objetivo é permitir análises como regressão linear da tendência de cada candidato ao longo da apuração.

- **Período coberto:** 04/10/2026 17:21:16 até 05/10/2026 12:51:05 (horário de Brasília)
- **Atualizações:** 383 (de 1,23% a 100% das urnas apuradas)
- **Abrangência:** Brasil (total nacional)
- **Candidatos:** 13

## Origem dos dados

Os dados foram coletados da página de apuração do **g1** (Grupo Globo), que exibe o gráfico de evolução da apuração:

<https://g1.globo.com/politica/eleicoes/2026/apuracao/presidente.ghtml>

O arquivo `data/raw/history.json` é o histórico usado por esse gráfico, coletado em 21/10/2026. Os números são os da totalização oficial do **Tribunal Superior Eleitoral (TSE)**, que o g1 republica, e o formato dos campos segue o padrão do TSE (`DT_TOTALIZACAO`, `PC_URNAS_APUR`, `vap`, `pvap` etc.). Este repositório não tem relação com o g1, o Grupo Globo ou o TSE.

## Estrutura

```
data/
  raw/history.json             JSON original, sem alterações
  processed/apuracao_largo.csv uma linha por atualização (formato largo)
  processed/apuracao_longo.csv uma linha por atualização x candidato (formato longo)
src/
  converter_historico.py       conversão do JSON para os CSVs
```

Para gerar os CSVs de novo (só biblioteca padrão do Python 3):

```bash
python src/converter_historico.py data/raw/history.json data/processed
```

## Dicionário de dados

Todos os CSVs usam UTF-8, vírgula como separador e **ponto como separador decimal**. Os percentuais estão em escala 0 a 100.

### Colunas comuns

| Coluna | Descrição | Campo original |
|---|---|---|
| `datetime` | Data e hora da totalização (ISO 8601, horário de Brasília) | `DT_TOTALIZACAO` |
| `pct_urnas_apuradas` | % de urnas apuradas | `PC_URNAS_APUR` |
| `pct_brancos` | % de votos brancos | `PC_BRANCOS` |
| `pct_nulos` | % de votos nulos | `PC_NULOS` |
| `pct_abstencao` | % de abstenção | `PC_ABSTEN` |
| `situacao` | `Parcial` ou `Final` | `CT_APURA` |

### `apuracao_longo.csv` (colunas extras)

| Coluna | Descrição | Campo original |
|---|---|---|
| `numero` | Número do candidato na urna | `n` |
| `candidato` | Nome de urna abreviado | `NM_CAND_ABREV` |
| `partido` | Sigla do partido | `ME_PARTIDO` |
| `votos` | Votos apurados até o momento | `vap` |
| `pct_votos_validos` | % dos votos válidos | `pvap` |

### `apuracao_largo.csv` (colunas extras)

Para cada candidato há `pct_<CANDIDATO>` (% dos votos válidos) e `votos_<CANDIDATO>` (votos apurados).

### Candidatos

| Nº | Candidato | Partido |
|---|---|---|
| 13 | LULA | PT |
| 14 | RENAN SANTOS | MISSÃO |
| 16 | HERTZ DIAS | PSTU |
| 21 | EDMILSON COSTA | PCB |
| 22 | FLAVIO BOLSONARO | PL |
| 27 | CLARIANA BARAO | DC |
| 28 | LEONARDO AVALANCHE | PRTB |
| 29 | RUI COSTA PIMENTA | PCO |
| 30 | ZEMA | NOVO |
| 35 | VETERINÁRIO WILSON GRASSI | DEMOCRATA |
| 55 | RONALDO CAIADO | PSD |
| 70 | ESCRITOR AUGUSTO CURY | AVANTE |
| 80 | SAMARA | UP |

## Tratamento aplicado

- Atualizações ordenadas por `datetime`. Um registro duplicado foi removido (384 no JSON, 383 nos CSVs).
- Vírgula decimal convertida em ponto, e votos convertidos para inteiro.
- LEONARDO AVALANCHE (PRTB) aparece na lista de candidatos, mas não tem votos em nenhuma atualização, então suas colunas ficam vazias no formato largo e ele não aparece no formato longo.

## Exemplo (pandas)

```python
import pandas as pd
df = pd.read_csv("data/processed/apuracao_largo.csv", parse_dates=["datetime"])
df[["pct_urnas_apuradas", "pct_LULA", "pct_FLAVIO BOLSONARO"]].plot(x="pct_urnas_apuradas")
```

## Licença

- **Código** (`src/`): [MIT](LICENSE).
- **Dados tratados** (`data/processed/`) e documentação: [CC BY 4.0](LICENSE-DATA.md). Pode usar, compartilhar e adaptar, inclusive para fins comerciais, desde que cite este repositório e a fonte original (TSE, via g1).
- **Dado bruto** (`data/raw/history.json`): é republicado aqui só para reprodutibilidade, e quaisquer direitos sobre ele continuam com seus titulares. Os resultados eleitorais são dados públicos divulgados pelo TSE.

## Como citar

> Nobre, G. (2026). *Evolução da apuração: Presidente 2026 (1º turno)*. Dados do TSE, coletados da página de apuração do g1 (https://g1.globo.com/politica/eleicoes/2026/apuracao/presidente.ghtml).
