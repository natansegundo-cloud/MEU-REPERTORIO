# AGENTS.md — Meu Repertório V2

## 1. IDENTIDADE DO PROJETO

Meu Repertório V2 é um aplicativo pessoal para organizar, estudar e executar repertórios musicais no violão.

O objetivo é construir um aplicativo extremamente funcional, confiável, rápido, visualmente refinado e preparado para evolução contínua.

O aplicativo é exclusivamente para uso pessoal, 100% gratuito, sem anúncios, sem monetização e sem necessidade de cadastro obrigatório.

A experiência deve priorizar:
- Praticidade durante apresentações.
- Organização de músicas e repertórios.
- Importação inteligente de cifras.
- Funcionamento offline.
- Interface intuitiva.
- Preservação dos dados.
- Estabilidade funcional.
- Excelente experiência em desktop e dispositivos móveis.

## 2. DIRETRIZES FUNDAMENTAIS

Estas regras são obrigatórias durante todo o desenvolvimento.

### 2.1. Prioridade absoluta

A ordem de prioridade é:

1. Integridade dos dados.
2. Correção funcional.
3. Estabilidade.
4. Experiência de uso.
5. Qualidade visual.
6. Novas funcionalidades.

Nunca priorize aparência ou funcionalidades novas em detrimento da estabilidade.

### 2.2. Desenvolvimento profissional

Não implemente soluções improvisadas quando existir uma abordagem arquitetural mais confiável.

Evite:
- Código duplicado.
- Lógica de negócio espalhada pela interface.
- Estados globais descontrolados.
- Manipulação manual excessiva de HTML.
- Componentes excessivamente grandes.
- Efeitos colaterais não controlados.
- Dependências desnecessárias entre módulos.
- Correções superficiais que escondam problemas reais.

Toda funcionalidade deve ter responsabilidades claras e separação adequada entre interface, lógica e persistência.

### 2.3. Preservação de funcionalidades

Não remova funcionalidades existentes durante uma implementação sem autorização explícita.

Quando uma funcionalidade precisar ser substituída:
- Identifique seu comportamento atual.
- Preserve os requisitos relevantes.
- Implemente a alternativa.
- Teste a nova implementação.
- Confirme que nenhum recurso importante foi perdido.

## 3. STACK TECNOLÓGICA OFICIAL

Utilize a seguinte stack como padrão.

### Aplicação
- React.
- TypeScript.
- Vite.

### Estilização
- CSS moderno.
- CSS Modules ou outra organização modular adequada.
- Design tokens e variáveis CSS.
- Lucide React para ícones.

### Estado
- React Hooks.
- Context API somente quando apropriado.
- Zustand quando houver necessidade real de estado compartilhado mais complexo.

Evite centralizar toda a aplicação em um único estado global.

### Banco de dados local
- IndexedDB.
- Dexie.
- Dexie React Hooks quando necessário.

### Testes
- Vitest.
- React Testing Library.
- Playwright.

### Qualidade de código
- ESLint.
- Prettier.
- TypeScript com strict mode.

### PWA e offline
- vite-plugin-pwa.
- Workbox.
- Service Worker gerado e configurado automaticamente.

### Organização de repertórios
- dnd-kit quando a implementação de arrastar e soltar for necessária.

### Componentes de interface
- Radix UI ou componentes próprios.
- Vaul quando necessário para drawers e painéis inferiores.

Não instale bibliotecas apenas porque estão listadas neste documento. Utilize-as quando forem apropriadas para a funcionalidade.

## 4. ARQUITETURA

O projeto deve possuir separação clara de responsabilidades.

Estrutura de referência:

src/
- app/
- components/
- features/
  - library/
  - songs/
  - parser/
  - transpose/
  - repertories/
  - show-mode/
  - favorites/
  - settings/
- hooks/
- services/
- database/
- sync/
- types/
- utils/
- styles/

A estrutura poderá ser adaptada conforme a evolução, desde que mantenha modularidade e organização.

### Regras arquiteturais

- Componentes React devem priorizar apresentação e interação.
- Regras musicais devem permanecer independentes da interface.
- O parser não deve depender de React.
- A transposição não deve depender de componentes visuais.
- O banco de dados deve ser acessado por uma camada organizada.
- A sincronização deve ser independente das telas.
- A interface não deve manipular diretamente estruturas internas do banco.
- Operações críticas devem possuir tratamento de erros.
- Não concentre toda a aplicação em App.tsx.

## 5. MOTOR MUSICAL

O motor musical é um dos componentes mais importantes do projeto.

Deve ser independente da interface.

Responsabilidades:
- Reconhecimento de acordes.
- Normalização de cifras.
- Transposição.
- Preservação de inversões.
- Preservação de extensões.
- Tratamento de acidentes musicais.
- Identificação de notas.
- Geração de diagramas.
- Representação estruturada das músicas.

Não implemente transposição simplesmente substituindo caracteres ou utilizando expressões regulares superficiais.

A transposição deve respeitar a estrutura musical dos acordes.

## 6. IMPORTAÇÃO DE CIFRAS

O aplicativo deve permitir importar músicas copiadas diretamente do Cifra Club e de formatos semelhantes.

O parser deverá:
- Identificar tom original.
- Identificar acordes.
- Preservar posicionamento das cifras.
- Preservar quebras de linha.
- Preservar versos e refrões.
- Reconhecer acordes complexos.
- Tratar cifras no meio das frases.
- Lidar com tabulações e caracteres Unicode.
- Permitir importação de músicas sem cifras.
- Permitir edição posterior.

O fluxo principal será:

1. Usuário cola o conteúdo.
2. Parser interpreta.
3. Música é salva diretamente.
4. Música fica disponível na biblioteca.

Não adicionar pré-visualização intermediária obrigatória.

O parser deve ser testável independentemente da interface.

## 7. BANCO DE DADOS

Utilize Dexie como camada principal do IndexedDB.

O banco deve armazenar:
- Músicas.
- Repertórios.
- Relações entre músicas e repertórios.
- Favoritos.
- Preferências.
- Configurações.
- Dados necessários para sincronização.

### Regras obrigatórias

- Nunca apagar dados automaticamente durante uma migração.
- Não modificar estruturas existentes sem estratégia de migração.
- Implementar versões de schema do IndexedDB.
- Implementar migrações incrementais.
- Garantir integridade referencial quando aplicável.
- Tratar falhas de leitura e escrita.
- Preservar compatibilidade com backup e restauração.

A estrutura do banco deve ser documentada.

## 8. SINCRONIZAÇÃO

Caso seja utilizada sincronização com Supabase, ela deverá ser implementada como módulo independente.

Requisitos:
- Sincronização confiável.
- Exclusões lógicas.
- Tratamento de conflitos.
- Recuperação de falhas.
- Registro de alterações pendentes.
- Sincronização incremental.
- Idempotência.
- Proteção contra duplicações.
- Preservação de dados offline.
- Não descartar alterações realizadas durante uma sincronização.

Não utilizar somente o relógio local dos dispositivos como mecanismo definitivo de resolução de conflitos.

Preferir versões, revisões ou mecanismos de concorrência apropriados.

A sincronização nunca deve provocar perda silenciosa de músicas ou repertórios.

## 9. FUNCIONAMENTO OFFLINE

O aplicativo deve funcionar completamente offline para suas funcionalidades essenciais.

Requisitos:
- Biblioteca disponível sem internet.
- Músicas acessíveis offline.
- Repertórios acessíveis offline.
- Transposição offline.
- Parser offline.
- Modo show offline.
- Edição offline.
- Persistência local.
- Atualizações do aplicativo sem apagar dados.

O funcionamento offline é um requisito permanente.

Não introduza dependências de APIs externas para funcionalidades essenciais.

## 10. FUNCIONALIDADES PRINCIPAIS

### Biblioteca
- Lista de músicas.
- Pesquisa instantânea.
- Favoritos.
- Ordenação.
- Músicas recentes.
- Edição.
- Exclusão.
- Importação.

### Músicas
- Letra.
- Cifras.
- Transposição.
- Tom original.
- Tom atual.
- Capotraste, quando aplicável.
- Diagramas.
- Anotações pessoais.
- Edição estruturada.

### Repertórios
- Criação.
- Renomeação.
- Exclusão.
- Organização.
- Reordenação.
- Adição e remoção de músicas.
- Repertórios independentes.
- Persistência confiável.

### Modo Show
- Interface dedicada.
- Navegação entre músicas.
- Música anterior e próxima.
- Rolagem automática.
- Controle de velocidade.
- Alternância entre letra e cifra.
- Tela sempre ativa quando suportado.
- Interface sem distrações.
- Acesso rápido às configurações relevantes.
- Preservação da posição atual quando apropriado.

O modo show deve ser tratado como uma experiência central, não como uma tela secundária.

## 11. DESIGN E EXPERIÊNCIA VISUAL

O aplicativo deve apresentar uma interface moderna, minimalista, profissional e cuidadosamente refinada.

Diretrizes:
- Design consistente.
- Hierarquia visual clara.
- Tipografia confortável.
- Espaçamento consistente.
- Ícones coerentes.
- Animações discretas.
- Feedback visual adequado.
- Estados vazios bem construídos.
- Loading states.
- Mensagens de erro compreensíveis.
- Excelente responsividade.

Evite:
- Aparência genérica de aplicativo gerado por IA.
- Excesso de cards.
- Excesso de bordas.
- Gradientes desnecessários.
- Botões redundantes.
- Interfaces congestionadas.
- Elementos decorativos sem função.
- Excesso de animações.

A interface deve parecer um produto real, cuidadosamente projetado.

## 12. TESTES E PREVENÇÃO DE BUGS

Testes são obrigatórios para funcionalidades críticas.

### Testes unitários
- Parser.
- Transposição.
- Normalização de acordes.
- Manipulação de dados.
- Regras de negócio.

### Testes de integração
- Persistência.
- Edição.
- Importação.
- Repertórios.
- Sincronização.

### Testes E2E
- Navegação.
- Criação de músicas.
- Edição.
- Importação.
- Exclusão.
- Criação de repertórios.
- Modo show.
- Persistência após recarregar.

Antes de considerar uma funcionalidade concluída:
- Execute os testes relevantes.
- Verifique regressões.
- Corrija erros encontrados.
- Não declare testes executados sem realmente executá-los.

## 13. PADRÃO DE IMPLEMENTAÇÃO

Antes de implementar uma funcionalidade complexa:

1. Analise os requisitos.
2. Identifique os módulos envolvidos.
3. Defina a abordagem.
4. Implemente de maneira modular.
5. Teste.
6. Valide integração.
7. Documente decisões relevantes.

Não faça alterações excessivamente abrangentes sem necessidade.

Não substitua código funcional apenas por preferência estilística.

Não crie abstrações desnecessárias.

Prefira soluções simples, robustas e bem organizadas.

## 14. USO DE DEPENDÊNCIAS

Dependências externas estão autorizadas.

Entretanto:
- Avalie a necessidade antes de instalar.
- Prefira bibliotecas maduras.
- Verifique compatibilidade.
- Considere tamanho do bundle.
- Considere funcionamento offline.
- Evite bibliotecas abandonadas.
- Evite duplicação de funcionalidades.
- Mantenha versões controladas.
- Não instale dependências sem justificativa.

O aplicativo não deve depender de serviços pagos para funcionar.

## 15. ESTRATÉGIA DE DESENVOLVIMENTO

O projeto será desenvolvido por etapas.

Não tente implementar todas as funcionalidades de uma vez.

Cada etapa deve:
- Possuir escopo claro.
- Produzir resultado funcional.
- Ser testada.
- Não comprometer etapas anteriores.
- Ser documentada quando necessário.

Priorize a estabilidade antes de adicionar recursos.

## 16. COMPORTAMENTO DO CODEX

Durante o desenvolvimento:

- Analise os arquivos antes de modificá-los.
- Leia este AGENTS.md antes de executar tarefas.
- Não invente informações sobre o código.
- Não assuma que funcionalidades existem sem verificar.
- Não ignore erros de compilação.
- Não esconda falhas de testes.
- Não remova funcionalidades sem autorização.
- Não faça alterações desnecessárias.
- Explique decisões arquiteturais relevantes.
- Informe arquivos modificados.
- Informe testes executados.
- Informe limitações encontradas.

Se houver ambiguidade importante, esclareça antes de realizar uma alteração destrutiva.

## 17. OBJETIVO FINAL

Construir um aplicativo pessoal de repertório musical que seja:

- Confiável.
- Offline.
- Rápido.
- Moderno.
- Funcional.
- Bem organizado.
- Fácil de manter.
- Visualmente refinado.
- Capaz de evoluir sem acumular bugs.

O Meu Repertório V2 deve priorizar qualidade de execução e experiência real de uso, especialmente durante apresentações musicais.

Toda decisão técnica deve contribuir para esse objetivo.