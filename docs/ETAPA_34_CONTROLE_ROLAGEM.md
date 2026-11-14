# Etapa 34 — Ajuste fino da rolagem no modo show

**Etapa:** 34
**Data:** 13/11/2026
**Checkout:** `v2`
**Status:** concluída em código, testes automatizados e validação visual em viewport estreita.

## 1. Objetivo

Permitir ajustar a velocidade da rolagem do modo show sem depender apenas da
barra deslizante, com botões simples de **+** e **−** em passos de 5 px/s.

## 2. Alterações

### Interface

O controle persistente de rolagem passou a exibir:

```text
[play]  Rolagem  [−]  [==== barra ====]  [+]  40 px/s
```

- `−` reduz 5 px/s, até o mínimo de 20 px/s;
- `+` aumenta 5 px/s, até o máximo de 100 px/s;
- os botões ficam desabilitados nos limites;
- cada ajuste continua sendo salvo na preferência `show.scrollSpeed`, então a
  velocidade escolhida permanece ao reabrir o modo show;
- o valor anunciado (`aria-live`) é atualizado imediatamente.

### Consistência dos valores

A velocidade agora é normalizada para múltiplos de 5 entre 20 e 100. O valor
padrão passou de 42 para 40 px/s, e preferências antigas são arredondadas para o
passo válido mais próximo ao carregar.

### Responsividade

- os botões usam a mesma linguagem visual dos demais controles do modo show;
- em telas com até 420 px, o rótulo “Rolagem” é ocultado para preservar espaço
  para a barra e os botões;
- o teste de viewport estreita continua garantindo que a barra não cria rolagem
  horizontal.

## 3. Arquivos alterados

- `src/features/show-mode/ShowModePage.tsx`
- `src/features/show-mode/ShowModePage.module.css`
- `e2e/show-mode.spec.ts`

## 4. Testes

O cenário E2E de rolagem passou a verificar:

1. velocidade definida pela barra em 80 px/s;
2. dois toques em **+** levam a 90 px/s;
3. um toque em **−** volta para 85 px/s.

Validação executada:

| Comando                           | Resultado                        |
| --------------------------------- | -------------------------------- |
| `npm run typecheck`               | passou                           |
| `npm run lint`                    | passou                           |
| `npm run format:check`            | passou                           |
| `npm run build`                   | passou                           |
| `npm test`                        | 47 arquivos, 259 testes passaram |
| `npx playwright test --workers=1` | 66 testes passaram               |

## 5. Limitações

- O passo é fixo em 5 px/s, conforme solicitado.
- A faixa de velocidade foi ampliada para 5 a 100 px/s na Etapa 35, depois do
  ajuste da leitura normal.
