# Bolão Copa 2026 — Elo + Poisson + Odds

Ferramenta de apoio a palpites de bolão para a fase de grupos da Copa do Mundo 2026. É um único arquivo HTML estático — sem build, sem dependências, sem servidor: basta abrir [`output/bolao-copa-2026-v3.html`](output/bolao-copa-2026-v3.html) no navegador.

## Como funciona

O app combina três fontes para sugerir placares:

1. **Ratings Elo** por seleção (editáveis na interface; conferir em [eloratings.net](https://www.eloratings.net)), com bônus de mando de campo para México, EUA e Canadá;
2. **Modelo de Poisson** — a diferença de Elo vira gols esperados de cada time, e a matriz de Poisson gera a probabilidade de cada placar;
3. **Odds de mercado (opcional)** — colando as cotações decimais 1/X/2 de um jogo, o app remove a margem da casa e passa a usar as probabilidades do mercado como fonte principal, mantendo o Elo visível para comparação.

A partir da matriz de placares e da pontuação do bolão (padrão 10/7/5: placar exato / vencedor + saldo / só vencedor), o app calcula três palpites por jogo:

| Palpite | Critério |
|---|---|
| **Seguro** | Maximiza os pontos esperados conforme a regra do bolão |
| **Conservador** | Placar comum do resultado mais provável (1×0, 2×0, 1×1...) |
| **Agressivo** | Placar menos óbvio, mas ainda provável, para buscar o placar exato |

## Recursos

- **12 grupos** (A–L) com os 72 jogos da 1ª fase em abas;
- **Deflator por time e por jogo** (80–100): cada ponto abaixo de 100 reduz 20 pontos Elo só naquele jogo — para desfalques ou time poupando titulares;
- **Contexto do jogo** (3ª rodada): time já classificado, precisa vencer, jogo morto, escalação incerta — ajusta Elo e gols esperados do confronto;
- **Comparação Elo × Odds** com alerta quando o mercado diverge do modelo em 10+ pontos percentuais;
- **Selo de risco** (baixo / médio / alto) por jogo, conforme o favoritismo e as divergências;
- **Selo de empate competitivo** quando a probabilidade de empate fica a até 12 p.p. da do favorito — historicamente cada rodada da fase de grupos tem ~20% de empates, e esses são os jogos onde cravar 1×1 mais compensa; nesses jogos o palpite conservador vira 1×1;
- **Persistência em localStorage**: parâmetros, Elos editados, odds, deflatores e contextos sobrevivem ao fechar o navegador (botão "Limpar ajustes salvos" no rodapé);
- Pontuação do bolão, mando e total de gols esperados configuráveis.

## Estrutura

```
├── output/
│   └── bolao-copa-2026-v3.html   # o app (HTML + CSS + JS num só arquivo)
├── docs/
│   └── spec-bolao-copa-2026-v3-codex.md   # especificação da v3
└── tests/
    ├── run.js       # extrai o <script> do HTML e roda com DOM stubado
    └── asserts.js   # asserções sobre o modelo e a persistência
```

## Testes

Requer Node.js (qualquer versão recente):

```bash
node tests/run.js
```

Cobre o tratamento do deflator, a massa de probabilidade da matriz de Poisson, os caminhos Elo e odds, ajustes de contexto, classificação de risco, o destaque de empate competitivo, o ajuste de lambdas às odds e o round-trip do localStorage.

## Dicas de uso

1. Use o palpite **seguro** como padrão;
2. Use **odds** nos jogos parelhos ou perto do horário do jogo;
3. Use **deflator** só quando a informação ainda não estiver refletida nas odds;
4. Na 3ª rodada, ajuste o **contexto do jogo** antes de confiar no Elo puro;
5. Em jogos de alto risco, considere o palpite conservador ou empate 1×1.
