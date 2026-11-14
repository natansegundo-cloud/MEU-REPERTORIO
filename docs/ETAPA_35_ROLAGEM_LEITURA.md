# Etapa 35 — Rolagem automática também na leitura normal

**Etapa:** 35
**Data:** 13/11/2026
**Checkout:** `v2`
**Status:** concluída em código, testes automatizados e validação em viewport estreita.

## 1. Objetivo

Disponibilizar a rolagem automática fora do modo show e permitir velocidades
realmente lentas, sem depender apenas da barra deslizante.

## 2. Rolagem disponível na leitura normal

O controle de rolagem passou a aparecer também na tela normal da música, logo
abaixo da barra de tom e opções de leitura:

```text
[play]  Rolagem  [−]  [==== barra ====]  [+]  40 px/s
```

A tela normal e o modo show compartilham:

- o mesmo controlador de rolagem;
- a mesma preferência de velocidade (`show.scrollSpeed`);
- a pausa automática ao rolar manualmente (roda, barra ou arrasto);
- os botões de ajuste fino em passos de 5 px/s.

### Organização

Para evitar duplicação, a lógica foi extraída para o módulo de músicas:

- `src/features/songs/scroll-controller.ts` — controlador por frame;
- `src/features/songs/use-auto-scroll.ts` — hook com estado, preferência,
  pausa manual e integração com a janela;
- `src/features/songs/index.ts` — exporta o hook e as constantes.

O modo show deixou de manter uma cópia própria do controlador e passou a usar o
mesmo hook. Nenhuma regra de navegação, tom, diagramas ou wake lock foi alterada.

## 3. Velocidade mínima

A velocidade mínima passou de 20 para **5 px/s**, mantendo o máximo em 100 px/s e
o passo de 5 px/s. A barra e os botões agora cobrem de 5 a 100 px/s.

### Frações de pixel

Em velocidades muito lentas, o avanço por frame é menor que 1 px. O controlador
passou a acumular frações e aplicar apenas pixels inteiros, garantindo que 5
px/s continue avançando de forma estável mesmo em navegadores que arredondam a
posição de scroll.

## 4. Responsividade

- em telas com até 560 px, o rótulo “Rolagem” é ocultado na leitura normal para
  preservar espaço para a barra e os botões;
- o contêiner recebeu `min-width: 0` para não criar rolagem horizontal em
  viewports estreitas;
- o teste existente de 343 px continua garantindo `scrollWidth <= innerWidth`.

## 5. Testes

- `src/features/songs/scroll-controller.test.ts` — acumulação de frações de
  pixel em 5 px/s;
- `e2e/song-reading.spec.ts` — rolagem automática na tela normal, ajuste de
  velocidade por botão, pausa e ausência de rolagem horizontal em 343 px;
- `e2e/show-mode.spec.ts` — comportamento existente do modo show preservado.

## 6. Validação

| Comando                           | Resultado                        |
| --------------------------------- | -------------------------------- |
| `npm run typecheck`               | passou                           |
| `npm run lint`                    | passou                           |
| `npm run format:check`            | passou                           |
| `npm run build`                   | passou                           |
| `npm test`                        | 47 arquivos, 260 testes passaram |
| `npx playwright test --workers=1` | 68 testes passaram               |

## 7. Limitações

- A rolagem automática foi adicionada à leitura da música e ao modo show; telas
  de edição e listagens não têm rolagem automática.
- O passo continua fixo em 5 px/s, conforme solicitado anteriormente.
