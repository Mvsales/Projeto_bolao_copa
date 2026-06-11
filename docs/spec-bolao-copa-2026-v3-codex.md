# Especificação para Codex — Bolão Copa 2026 v3

## Contexto

Este projeto é um app HTML estático para apoiar palpites de bolão da Copa do Mundo 2026. A versão atual (`bolao-copa-2026-v2.html`) já implementa um modelo baseado em:

- Ratings Elo por seleção;
- Modelo de Poisson para estimar placares;
- Pontuação customizável do bolão;
- Mando de campo via bônus Elo;
- Total de gols esperados configurável;
- Deflator por time e por jogo;
- Modo odds, onde o usuário cola odds decimais 1/X/2 e o modelo usa o mercado em vez do Elo.

O objetivo da v3 é transformar o app de uma simples calculadora de placar em uma ferramenta melhor de decisão para bolão.

---

## Objetivo da v3

Implementar uma versão mais estratégica do app, mantendo o núcleo atual Elo + Poisson + Odds, mas adicionando:

1. Ajuste de força mais controlado para desfalques/classificação antecipada;
2. Modo de contexto do jogo, especialmente para 3ª rodada;
3. Comparação entre probabilidades Elo e probabilidades de mercado;
4. Três tipos de palpite por jogo: seguro, agressivo e conservador;
5. Alertas visuais para jogos de alto risco ou alta divergência.

---

## Problema identificado na v2

Na v2, o deflator multiplica diretamente o Elo do time.

Exemplo:

```js
const ea = ELO[a] * (st.defA / 100)
```

Isso funciona, mas pode ser agressivo demais.

Exemplo:

- Time com Elo 2000;
- Deflator 90%;
- Elo ajustado vira 1800;
- Penalidade implícita: -200 pontos Elo.

Essa queda é muito grande para um simples desfalque. Pode fazer sentido para time inteiro reserva, mas não para ausência de um jogador importante.

---

## Melhoria 1 — Separar Elo base de Elo ajustado

### Requisito

Trocar a lógica de ajuste de força baseada em multiplicação direta do Elo por uma lógica de penalidade controlada.

### Regra sugerida

Em vez de:

```js
Elo ajustado = Elo base * deflator / 100
```

Usar:

```js
penalidade = (100 - deflator) * 20
Elo ajustado = Elo base - penalidade
```

### Exemplos

| Deflator | Penalidade | Interpretação |
|---:|---:|---|
| 100% | 0 Elo | força total |
| 99% | -20 Elo | ajuste mínimo |
| 98% | -40 Elo | pequeno desfalque |
| 97% | -60 Elo | desfalque relevante |
| 96% | -80 Elo | impacto forte |
| 94% | -120 Elo | vários desfalques / time misto |
| 90% | -200 Elo | time muito reserva |

### Observação

Manter o campo na interface como “Deflator (%)”, pois é intuitivo para o usuário. Mas internamente converter para penalidade Elo.

### Função sugerida

```js
function adjustedElo(teamName, deflator, hostBonus = 0) {
  const base = ELO[teamName];
  const penalty = Math.max(0, 100 - deflator) * 20;
  return base - penalty + hostBonus;
}
```

### Exibição na UI

Mostrar:

```text
Elo base 2030 · ajustado 1990
```

Ou, de forma compacta:

```text
Elo 2030 → 1990
```

Quando o deflator for 100%, exibir apenas:

```text
Elo 2030
```

---

## Melhoria 2 — Modo contexto do jogo

### Requisito

Adicionar um campo em cada jogo chamado `Contexto do jogo`.

### Opções sugeridas

```text
Normal
Time A já classificado
Time B já classificado
Ambos já classificados
Time A precisa vencer
Time B precisa vencer
Ambos precisam vencer
Jogo morto / baixa motivação
Escalação incerta
```

### Efeitos sugeridos

| Contexto | Ajuste sugerido |
|---|---|
| Normal | sem ajuste |
| Time A já classificado | Time A -60 Elo |
| Time B já classificado | Time B -60 Elo |
| Ambos já classificados | Ambos -40 Elo e reduzir gols esperados |
| Time A precisa vencer | Time A +20 Elo e leve aumento de gols |
| Time B precisa vencer | Time B +20 Elo e leve aumento de gols |
| Ambos precisam vencer | aumentar gols esperados em +0,15 |
| Jogo morto / baixa motivação | reduzir gols esperados em -0,20 |
| Escalação incerta | mostrar alerta visual, sem ajuste automático obrigatório |

### Observação

Esses ajustes devem ser aplicados somente no jogo selecionado, sem alterar o Elo base global.

### Implementação sugerida

Adicionar ao estado do jogo:

```js
const gameState = {
  defA: 100,
  defB: 100,
  o1: "",
  oX: "",
  o2: "",
  context: "normal"
}
```

Criar função:

```js
function contextAdjustment(context, side) {
  // side = 'A' ou 'B'
  // retorna { eloDeltaA, eloDeltaB, totalGoalsDelta, alert }
}
```

---

## Melhoria 3 — Comparar Elo vs Odds

### Requisito

Mesmo quando o usuário preencher odds e o palpite final vier do mercado, calcular também as probabilidades via Elo para comparar.

### Objetivo

Mostrar quando o mercado discorda muito do modelo Elo.

Exemplo:

```text
Elo: México 82% · Empate 12% · África do Sul 5%
Odds: México 68% · Empate 20% · África do Sul 12%
Alerta: mercado está menos confiante no favorito do que o Elo.
```

### Critério de alerta

Criar um alerta quando a diferença absoluta entre Elo e odds for maior que 10 pontos percentuais em qualquer resultado 1/X/2.

```js
const diffA = Math.abs(probElo.home - probOdds.home);
const diffX = Math.abs(probElo.draw - probOdds.draw);
const diffB = Math.abs(probElo.away - probOdds.away);
const maxDiff = Math.max(diffA, diffX, diffB);

if (maxDiff >= 0.10) {
  // mostrar alerta
}
```

### Texto do alerta

Sugestões:

```text
⚠️ Mercado discorda do Elo
```

ou

```text
Alerta: odds indicam risco maior do que o Elo sugere.
```

### Regra de uso

- Se odds estiverem preenchidas, o palpite principal deve continuar vindo das odds;
- Mas a UI deve exibir a comparação Elo vs Odds;
- Se odds não estiverem preenchidas, exibir apenas o cálculo Elo.

---

## Melhoria 4 — Três tipos de palpite

### Requisito

Hoje o app calcula um único palpite com maior valor esperado conforme a pontuação do bolão.

Na v3, exibir três palpites:

1. **Palpite seguro**;
2. **Palpite agressivo**;
3. **Palpite conservador**.

---

### 4.1 Palpite seguro

É o palpite atual: maximiza o valor esperado considerando a pontuação do bolão.

Usar a função atual `bestPick(...)`.

Exemplo de rótulo:

```text
Seguro: 2 × 0
```

---

### 4.2 Palpite agressivo

Objetivo: buscar placar exato com bom valor, aceitando mais risco.

Regra sugerida:

- Calcular a probabilidade de cada placar;
- Considerar apenas placares coerentes com o resultado mais provável;
- Selecionar um placar um pouco menos óbvio, mas ainda provável.

Exemplo:

Se o placar mais provável for `1 x 0`, mas `2 x 0` tiver probabilidade parecida e melhor upside no bolão, sugerir `2 x 0`.

Implementação simples:

```js
function aggressivePick(M, favoriteSign) {
  // favoriteSign: 1 casa, 0 empate, -1 visitante
  // listar placares até 5x5
  // filtrar placares com o mesmo sinal do favorito
  // ordenar por probabilidade
  // retornar o segundo ou terceiro placar mais provável, desde que não seja absurdo
}
```

Regras de segurança:

- Evitar placares acima de 4 gols para um time, salvo favoritismo extremo;
- Evitar placares com diferença maior que 3;
- Para jogos equilibrados, considerar `1 x 1` como agressivo válido.

---

### 4.3 Palpite conservador

Objetivo: maximizar chance de acertar vencedor/empate, não placar exato.

Regra sugerida:

1. Identificar o resultado 1/X/2 mais provável;
2. Escolher um placar comum para esse resultado.

Mapeamento sugerido:

| Resultado mais provável | Palpite conservador |
|---|---|
| Mandante favorito leve | 1 x 0 |
| Mandante favorito forte | 2 x 0 |
| Empate provável | 1 x 1 |
| Visitante favorito leve | 0 x 1 |
| Visitante favorito forte | 0 x 2 |

Critério de favoritismo forte:

```js
probabilidade >= 0.60
```

Exemplo:

```text
Conservador: 1 × 0
```

---

## Melhoria 5 — Classificação de risco do jogo

### Requisito

Adicionar um selo de risco por jogo.

### Critérios sugeridos

| Condição | Risco |
|---|---|
| Favorito com probabilidade >= 65% | Baixo |
| Favorito entre 50% e 65% | Médio |
| Favorito abaixo de 50% | Alto |
| Diferença Elo vs Odds >= 10 p.p. | Aumenta um nível |
| Contexto “Escalação incerta” | Aumenta um nível |

### Exibição

```text
Risco baixo
Risco médio
Risco alto
```

Usar cores discretas:

- Baixo: verde/muted;
- Médio: dourado;
- Alto: vermelho.

---

## Melhoria 6 — Layout sugerido por jogo

A UI de cada jogo pode ficar assim:

```text
11.jun · Grupo A · Risco baixo
México 🏠                 África do Sul
Elo 1850 → 1930           Elo 1615

Palpite seguro:       2 × 0
Palpite conservador:  2 × 0
Palpite agressivo:    3 × 0

Probabilidades Elo:
México 82% · Empate 12% · África do Sul 5%

[barra visual]

Deflator e odds deste jogo
- Deflator México
- Deflator África do Sul
- Odd 1
- Odd X
- Odd 2
- Contexto do jogo
```

Quando odds estiverem preenchidas:

```text
Palpite principal via odds
Odds: México 68% · Empate 20% · África do Sul 12%
Elo:  México 82% · Empate 12% · África do Sul 5%
⚠️ Mercado discorda do Elo
```

---

## Melhoria 7 — Estratégia para bolão

Adicionar texto de ajuda na parte inferior do app:

```text
Como usar:
1. Use o palpite seguro como padrão.
2. Use odds nos jogos parelhos ou perto do horário do jogo.
3. Use deflator só quando a informação ainda não estiver refletida nas odds.
4. Na 3ª rodada, ajuste o contexto do jogo antes de confiar no Elo puro.
5. Em jogos de alto risco, considere o palpite conservador ou empate 1x1.
```

---

## Pontos que devem ser preservados da v2

Preservar:

- Estrutura HTML estática;
- Sem dependências externas de build;
- Interface responsiva;
- Paleta visual de campo/futebol;
- Tabs por grupo;
- Edição manual dos ratings Elo base;
- Pontuação configurável 10/7/5;
- Campo de gols esperados;
- Mando de campo por Elo;
- Modo odds 1/X/2;
- Cálculo Poisson;
- Busca do melhor palpite por pontos esperados.

---

## Pontos de atenção

### 1. Copa 2026 tem 48 seleções

A v2 já está estruturada com 12 grupos de 4 seleções.

### 2. Dados de Elo precisam ser atualizáveis

Manter o painel “Ajustar ratings Elo base”. O usuário deve conseguir ajustar manualmente caso pegue ratings mais recentes.

### 3. Odds devem remover margem da casa

A v2 já faz isso:

```js
const p = [1/o1, 1/oX, 1/o2]
const s = p[0] + p[1] + p[2]
const t = [p[0]/s, p[1]/s, p[2]/s]
```

Preservar esse comportamento.

### 4. Não exagerar no ajuste subjetivo

O app deve ajudar o usuário a ajustar, mas evitar induzir overfitting manual.

Adicionar aviso:

```text
Use deflator com parcimônia. Se a notícia já é pública, as odds provavelmente já capturaram melhor esse efeito.
```

---

## Funções novas sugeridas

### adjustedElo

```js
function adjustedElo(teamName, deflator, hostBonus = 0, contextDelta = 0) {
  const base = ELO[teamName];
  const penalty = Math.max(0, 100 - deflator) * 20;
  return base - penalty + hostBonus + contextDelta;
}
```

### contextAdjustment

```js
function contextAdjustment(context) {
  const result = {
    eloDeltaA: 0,
    eloDeltaB: 0,
    totalGoalsDelta: 0,
    alert: ""
  };

  switch (context) {
    case "a_classificado":
      result.eloDeltaA = -60;
      result.alert = "Time A pode poupar titulares";
      break;
    case "b_classificado":
      result.eloDeltaB = -60;
      result.alert = "Time B pode poupar titulares";
      break;
    case "ambos_classificados":
      result.eloDeltaA = -40;
      result.eloDeltaB = -40;
      result.totalGoalsDelta = -0.15;
      result.alert = "Jogo pode ter menor intensidade";
      break;
    case "a_precisa_vencer":
      result.eloDeltaA = 20;
      result.totalGoalsDelta = 0.10;
      break;
    case "b_precisa_vencer":
      result.eloDeltaB = 20;
      result.totalGoalsDelta = 0.10;
      break;
    case "ambos_precisam_vencer":
      result.totalGoalsDelta = 0.15;
      break;
    case "jogo_morto":
      result.totalGoalsDelta = -0.20;
      result.alert = "Baixa motivação esperada";
      break;
    case "escalacao_incerta":
      result.alert = "Escalação incerta: prefira odds próximas do jogo";
      break;
  }

  return result;
}
```

### marketProbabilitiesFromOdds

```js
function marketProbabilitiesFromOdds(o1, oX, o2) {
  const p = [1 / o1, 1 / oX, 1 / o2];
  const s = p[0] + p[1] + p[2];
  return {
    home: p[0] / s,
    draw: p[1] / s,
    away: p[2] / s
  };
}
```

### compareEloVsOdds

```js
function compareEloVsOdds(probElo, probOdds) {
  const diffs = {
    home: Math.abs(probElo.home - probOdds.home),
    draw: Math.abs(probElo.draw - probOdds.draw),
    away: Math.abs(probElo.away - probOdds.away)
  };

  const maxDiff = Math.max(diffs.home, diffs.draw, diffs.away);

  return {
    maxDiff,
    hasAlert: maxDiff >= 0.10,
    message: maxDiff >= 0.10 ? "Mercado discorda do Elo" : ""
  };
}
```

### riskLevel

```js
function riskLevel(probs, oddsComparison, context) {
  const favorite = Math.max(probs.home, probs.draw, probs.away);
  let level = favorite >= 0.65 ? 0 : favorite >= 0.50 ? 1 : 2;

  if (oddsComparison?.hasAlert) level += 1;
  if (context === "escalacao_incerta") level += 1;

  level = Math.min(level, 2);

  return ["baixo", "médio", "alto"][level];
}
```

---

## Backtest e calibração

A v2 foi pensada a partir de um backtest conceitual da Copa 2022, com regra de pontuação 10/7/5.

Principais aprendizados usados na v2:

- Total de gols esperado de 2,3 funcionou melhor que 2,64 para Copa;
- Copas tendem a ter jogos mais travados;
- Placar exato é difícil, então 1x0, 2x0, 2x1 e 1x1 são importantes;
- Odds tendem a ser melhores que Elo isolado quando disponíveis;
- A 3ª rodada precisa de tratamento especial por causa de classificação antecipada e escalações alternativas.

A v3 deve preservar esses aprendizados.

---

## Critérios de aceite

A entrega será considerada boa se:

1. O app continuar funcionando como HTML estático;
2. Todos os jogos continuarem renderizando por grupo;
3. O usuário conseguir ajustar Elo base, pontuação, mando e gols esperados;
4. O deflator deixar de multiplicar diretamente o Elo e passar a usar penalidade controlada;
5. Cada jogo tiver campo de contexto;
6. Cada jogo mostrar palpite seguro, agressivo e conservador;
7. Odds continuarem funcionando;
8. Quando odds forem preenchidas, o app mostrar comparação Elo vs Odds;
9. Jogos com alta divergência ou incerteza exibirem alerta;
10. A UI continuar simples e responsiva.

---

## Prioridade de implementação

### Prioridade alta

1. Trocar lógica do deflator;
2. Adicionar três palpites;
3. Adicionar contexto do jogo;
4. Comparar Elo vs Odds;
5. Mostrar risco do jogo.

### Prioridade média

1. Melhorar textos explicativos;
2. Melhorar badges visuais;
3. Exibir Elo base → Elo ajustado;
4. Adicionar dicas de uso.

### Prioridade baixa

1. Persistir ajustes no localStorage;
2. Exportar palpites para CSV;
3. Botão para copiar palpites do grupo;
4. Simulação de pontuação do bolão.

---

## Ideias futuras

Para uma v4, considerar:

- Importação automática de odds via CSV;
- Exportação dos palpites para Excel/CSV;
- Simulador de classificação dos grupos;
- Entrada de palpites dos outros participantes para estratégia de diferenciação;
- Backtest real com dados históricos;
- LocalStorage para preservar ajustes do usuário;
- Modo “copiar todos os palpites”.
