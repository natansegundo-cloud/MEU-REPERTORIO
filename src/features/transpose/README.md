# Motor musical

Este domínio contém regras musicais puras, sem dependência de React, IndexedDB,
DOM ou serviços externos.

## Módulos

- `notes.ts`: classes de altura, notas naturais, sustenidos, bemóis,
  equivalências enarmônicas e intervalos cromáticos;
- `chords.ts`: leitura tipada de símbolos, preservação do texto original,
  normalização de raízes/baixos e interpretação de qualidades/extensões;
- `keys.ts`: identificação e transposição de tonalidades maiores e menores;
- `transpose.ts`: transposição de acordes, sequências e estruturas sem mutar o
  objeto de entrada;
- `diagrams.ts`: busca de voicings no braço do violão e representação pronta
  para uma futura renderização;
- `index.ts`: superfície pública do motor.

## Contrato de diagramas

`getChordVoicings()` retorna posições com seis cordas em ordem da corda 6 para a
corda 1. Cada posição informa:

- `frets`: casas, com `-1` para abafada e `0` para corda solta;
- `baseFret`: primeira casa exibida pelo diagrama;
- `strings`: estado, número da corda, casa, dedo e classe de altura;
- `fingers`: posições individuais dos dedos;
- `barre`: pestana, quando houver;
- `approximate` e `omittedIntervals`: indicam quando uma extensão foi omitida
  para produzir uma posição tocável.

As formas clássicas da primeira posição são priorizadas. Quando não há uma
forma direta, o motor procura alternativas até a casa 15, respeitando a nota
do baixo em inversões e limitando posições excessivamente difíceis.

## Decisões

- A cifra original fica em `ParsedChord.original`; a transposição altera apenas
  raízes e baixos, preservando o sufixo recebido.
- A validação usa uma gramática de símbolos e não uma lista fechada de acordes.
- A grafia automática usa nomes cromáticos comuns; o chamador pode exigir
  `sharp` ou `flat` quando a tonalidade pedir uma convenção específica.
- O parser de letras e linhas continua fora deste módulo e será implementado em
  uma etapa posterior.
