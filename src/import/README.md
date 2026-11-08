# Importação de texto e PDF

TXT e PDF entram pelo mesmo editor de importação e sempre passam por revisão
antes de salvar. TXT tenta UTF-8 estrito e usa Latin-1 como fallback. PDF é
carregado sob demanda, limitado a 20 MB, sem OCR e sem persistência do arquivo
original. A extração preserva quebras e espaçamento por coordenadas para o
parser de cifras.

Em cada página, a extração procura um gutter central de pelo menos 3% da
largura, vazio em pelo menos 90% das linhas do corpo. Quando ele existe, a
leitura percorre a coluna esquerda de cima para baixo e depois a direita. O
cabeçalho do Cifra Club preenche título, artista e tom; composição e afinação
ficam disponíveis como observações na revisão.

O build separa `pdfjs-dist` e seu worker em chunks próprios. O service worker
não os precacheia; quando usados, entram somente no cache de runtime.
