# Auditoria do design system — Etapa 20

> **Nota (Etapa 26):** este documento registra a auditoria da Etapa 20 e a
> identidade então adotada (verde/violeta). A paleta e os tokens foram
> substituídos na Etapa 26; consulte `ETAPA_26_IDENTIDADE_VISUAL.md` para o
> sistema visual vigente.

## Escopo

Auditoria da fundação visual do Meu Repertório V2 antes do refinamento de telas.
O trabalho desta etapa fica restrito a tokens, estilos globais e componentes-base
existentes. Parser, motor musical, persistência, sincronização, importação,
navegação e comportamento das telas não fazem parte da mudança.

Não havia screenshots de referência disponíveis como arquivos locais neste
checkout; o diagnóstico abaixo combina o briefing da etapa com a leitura do
código atual.

## Diagnóstico inicial

### Tokens e paleta

- A base já era centralizada em `src/styles/tokens.css`, mas a escala de raios
  variava de controles compactos até superfícies muito arredondadas.
- A paleta clara usava fundo quente com acento azul-violeta; no modo escuro, o
  acento ficava mais luminoso e o contraste visual entre superfície, interação e
  destaque não estava nomeado de forma explícita.
- Sombras estavam presentes em cards, estados vazios e superfícies de conteúdo,
  reforçando a sensação de dashboard com muitos níveis de elevação.
- Não existia um token para superfície interativa nem para altura de controles.

### Componentes-base

- `Button` já possuía variantes e estados, mas o tamanho `sm` tinha a mesma altura
  mínima do tamanho padrão.
- `Badge` usava formato totalmente pill, repetindo um padrão visual forte em
  elementos de baixa prioridade.
- `SettingsCard`, `EmptyState` e `SongCard` combinavam borda, fundo próprio e
  sombra, criando repetição de contornos.
- Ícones de `SettingsCard` e `SongCard` tinham caixas coloridas que competiam com
  os títulos e o conteúdo musical.
- Os estilos de inputs estavam distribuídos por páginas, sem uma base global
  coerente para altura, foco e superfície.

### Tipografia e densidade

- A tipografia Bricolage Grotesque já fornece personalidade adequada ao produto;
  não foi necessário trocar fonte ou adicionar dependência.
- A hierarquia existente é funcional, porém alguns títulos e espaços verticais
  podem parecer maiores do que o necessário em telas compactas.
- O foco global estava correto, mas inputs não compartilhavam o mesmo tratamento
  visual.

## Identidade definida

Direção: papel quente e verde-esprite no fundo, acento violeta amaciado, bordas
discretas e uma hierarquia que privilegia a letra, a cifra e a ação principal.

- **Background:** `#f7f5ef` no claro e `#101614` no escuro.
- **Superfícies:** branco quente/verde profundo, com superfície elevada apenas
  quando há necessidade de separar conteúdo.
- **Accent:** violeta musical dessaturado, usado para ação primária, foco e
  estado ativo.
- **Texto:** verde carvão no claro e verde muito claro no escuro, com níveis
  explícitos para texto secundário e sutil.
- **Estados semânticos:** sucesso, aviso e erro continuam separados do accent e
  são usados apenas para feedback.

O resultado evita gradientes, sombras decorativas e cores saturadas em grandes
áreas. A diferenciação passa a vir principalmente de contraste, espaço e
hierarquia tipográfica.

## Alterações desta etapa

- Reorganização de cores, raios, sombras e alturas de controles em `tokens.css`.
- Inclusão de `surface-interactive`, `control-height-*` e `focus-ring`.
- Base global para inputs, textareas e selects, preservando exceções de checkbox,
  radio, range e file.
- Refinamento de `Button` para distinguir melhor densidade, superfície secundária
  e estado hover/active.
- `Badge` com raio compacto em vez de pill dominante.
- `SettingsCard` sem sombra e com ícone sem caixa colorida.
- `EmptyState` com borda tracejada e ícone mais compacto.
- `SongCard` com hover por superfície e sem sombra/elevação artificial.

## Pendências para etapas futuras

- Revisar cada página com screenshots reais em iPhone, iPad e desktop.
- Consolidar estilos de inputs específicos que ainda possuem regras locais e
  valores literais.
- Revisar `SongSheet`, modo show e telas de importação em etapas próprias, sem
  alterar o comportamento musical.
- Validar contraste e densidade em aparelho Apple real, especialmente em modo
  escuro e em orientação landscape.
