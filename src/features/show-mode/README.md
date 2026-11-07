# Show mode

Experiência de apresentação: navegação, rolagem e controles para execução.

## Modo show

`show-session.ts` contém a sessão pura de apresentação: filtra itens sem música,
mantém limites e permite avançar, voltar e saltar sem depender do React.

`ShowModePage` observa o repertório por `liveQuery`, usa o mesmo `SongSheet` da
leitura normal e persiste posição, velocidade, escala de fonte e visibilidade de
diagramas na tabela `preferences`. O tom temporário do show é salvo somente em
`RepertoryItem.preferredKey` através do serviço de repertórios.

Gestos, atalhos, rolagem e Wake Lock usam APIs nativas. Não há dependência de
arrastar, gestos ou gerenciamento global de estado.
