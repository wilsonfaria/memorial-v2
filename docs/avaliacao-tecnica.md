# Avaliação técnica — inovação e tecnologia

Avaliação crítica do projeto (não comercial), feita em 28/09/2026, após a
entrega da transcrição por IA, da busca no texto (Meilisearch) e da
transcrição automática em segundo plano. Serve de referência para medir a
evolução e priorizar os próximos passos.

## Nota geral: 6/10

Tecnicamente sólido e bem acima da média de acervos digitais de jornais do
interior, mas, na régua de inovação, ainda é **aplicação competente de ideias
conhecidas**, não algo novo.

## Por dimensão

| Critério | Nota | Justificativa |
|---|---|---|
| Ideia central (IA lendo a imagem da página) | 7,5 | Melhor decisão do projeto: trocar o OCR clássico por um modelo que lê a imagem e **preserva a grafia de época** ("instrucção", "Piumhy") é o que as grandes bibliotecas estão testando agora — aqui, com custo zero. |
| Método de escolha do modelo | 6 | Houve piloto comparativo e um teste objetivo de fidelidade, mas a amostra é mínima (1 faixa, 16 palavras). Não há métrica de qualidade (CER/WER) contra um gabarito revisado por humano. |
| Arquitetura | 6 | Pipeline por etapas, OCR original preservado, busca com fallback no MariaDB: correto. Porém há estado crítico em memória (cotas, estado da automação) e um processo de fundo dentro do servidor web — funciona com 1 container, não escala. Várias correções vieram de premissas erradas (stream com `Readable.toWeb`, cota mal classificada). |
| Busca | 6 | Meilisearch tolerante a erro é a escolha certa, mas é busca **por palavra**: não entende assunto, não mostra *onde* na página está o termo, e o "texto corrido" depende de heurísticas que erram em casos de borda. |
| Qualidade de engenharia | 5 | **Nenhum teste automatizado**; verificação manual caso a caso; partes do admin nunca vistas funcionando pelo agente (login). Resquícios da Hostinger nos comentários. Processo muito reativo (ajustes visuais em sequência). |
| Sustentabilidade | 5 | Dependência total do plano gratuito do Google, que pode mudar a qualquer momento; no plano gratuito o Google **pode usar os dados enviados para treinar modelos** (aceitável para jornal público, mas deve ser decisão consciente). Sem exportação em formatos de arquivo digital. |
| Inovação de produto | 5 | Para o leitor, ainda é "folhear PDFs e buscar palavras". O potencial que a transcrição abre ainda não foi explorado. |

## O que levaria a 8–9

1. **Extrair estrutura, não só texto.** Cada matéria vira dado: pessoas,
   lugares, datas, tipo (nascimento, óbito, casamento, anúncio). Daí: página
   de cada pessoa, genealogia das famílias de Piumhi, mapa, linha do tempo
   automática. **Este é o passo realmente inovador** (o `BirthdayFinder` é uma
   semente disso).
2. **Busca semântica** (o Meilisearch já suporta busca híbrida com embeddings).
3. **Destacar o termo na imagem da página** (coordenadas de cada trecho).
4. **Correção colaborativa** de `[ilegível]` com histórico — como os grandes
   acervos melhoram com o tempo.
5. **Medir a qualidade:** ~20 páginas transcritas à mão como gabarito e nota
   objetiva (CER) por modelo, antes de trocar de modelo ou de prompt.
6. **Formatos abertos de acervo** (ALTO/IIIF) e **testes automatizados** no
   núcleo (transcrição, reflow, busca).

## Resumo

A base está bem feita e a decisão mais importante — IA lendo a imagem com
fidelidade à época — foi acertada. Mas até aqui o projeto **digitalizou melhor
o que já existia**; a inovação de fato seria transformar décadas de jornal numa
base consultável sobre **pessoas e fatos** da cidade.

## Progresso desde a avaliação

**28/09/2026 — Fases 1 e 2 (protótipo)**

- *Método / Engenharia:* revisão humana com histórico de versões; páginas
  conferidas formam o gabarito e a tela **Qualidade da IA** calcula CER/WER por
  modelo sem novas chamadas à API; testes automatizados (`npm test`, 21
  casos: texto corrido, distância de edição/CER, Range HTTP, normalização de
  nomes). O agente passou a verificar o admin com um usuário de teste local.
- *Inovação de produto:* extração estruturada (matérias com tipo e resumo,
  pessoas com tratamento e papel, lugares) e páginas públicas `/pessoas` e
  `/lugares` com linha do tempo das menções, grafias alternativas e "aparece
  junto com". Nomes reunidos por grafia (Piumhy/Piumhi, Josè/José).
- *Limites conhecidos:* Gemma (cota grande) não serviu como extrator — a
  extração usa a cota do Flash Lite (~20% a mais por página); nomes
  incompletos ("cap. Motta") ficam separados até haver revisão humana de
  identidades; tudo depende do avanço da transcrição.
