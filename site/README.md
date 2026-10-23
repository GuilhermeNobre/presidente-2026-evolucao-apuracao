# 2º Turno em Jogo · site do simulador

Página única, em HTML/CSS/JS puro (sem build), que leva o capítulo 11 do notebook
`notebooks/regressao_linear.ipynb` para o navegador.

- **01 Simulador:** transferência da 3ª via (Cury, Renan Santos, Caiado, Zema, Demais) com
  dois controles por bloco: para quem vão os votos e quantos não votam em ninguém.
  Mostra o resultado, o ponto de virada e o passo a passo do 11.4. O cenário fica na URL
  (botão "Copiar link do cenário").
- **02 Apuração:** pontos da apuração do 1º turno, retas da regressão linear simples e
  treino parcial (30/50/75/100% das urnas), com tooltip e navegação por teclado.
- **03 Tempo real:** em construção.
- **Metodologia** (`metodologia.html`, página separada): dados, fórmulas, tabela das retas,
  limitações e link para o notebook no GitHub.

Só votos válidos. Simulação acadêmica, não é previsão eleitoral.

## Como abrir

Dê dois cliques em `index.html`, ou sirva a pasta:

```bash
cd site
python3 -m http.server 8000   # abra http://localhost:8000
```

Funciona em GitHub Pages sem configuração.

## Dados

`js/dados.js` é gerado a partir de `../data/processed/apuracao_largo.csv`:

```bash
cd site
python3 scripts/gerar_dados.py
```

O script reproduz a preparação do notebook (percentuais sobre votos válidos, blocos da
3ª via, um ponto por % de urnas) e imprime as retas para conferência
(Flávio: ŷ = 50,3665 − 0,029972·x; Lula: ŷ = 41,1361 + 0,036365·x).

## Estrutura

```
index.html
metodologia.html
css/style.css
js/dados.js          gerado, não editar
js/app.js            regressão, simulador, gráficos e animações
js/metodologia.js    tema, menu e tabela das retas da página de metodologia
image/*-retrato.webp recortes 480×480 das fotos originais
scripts/gerar_dados.py
```

As animações respeitam a preferência "reduzir movimento" do sistema.
