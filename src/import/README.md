# Importacao de texto e PDF

TXT e PDF entram pelo mesmo editor de importacao e sempre passam por revisao
antes de salvar. TXT tenta UTF-8 estrito e usa Latin-1 como fallback. PDF e
carregado sob demanda, limitado a 20 MB, sem OCR e sem persistencia do arquivo
original. A extracao preserva quebras e espacamento por coordenadas para o
parser de cifras.

O build separa `pdfjs-dist` e seu worker em chunks proprios. O service worker
nao os precacheia; quando usados, entram somente no cache de runtime.
