# Brockmann

Originais OTF fornecidos pelo proprietário da marca (Atipo Foundry). Preservados sem alteração.

WOFF2 principal e WOFF de compatibilidade gerados com fontTools.ttLib.TTFont, mantendo todos os glifos, kerning e recursos OpenType. Cada arquivo conserva seu peso e estilo; nenhum itálico sintético. O build distribui apenas os formatos web; o navegador baixa somente a alternativa suportada e os estilos usados.

Conversão reproduzível: abrir cada OTF com TTFont, definir flavor como woff2 ou woff e salvar em novo arquivo. Requer fonttools e brotli. Não converter contornos CFF para TTF ou formatos EOT/SVG obsoletos: não melhora o carregamento dos navegadores suportados.

Pendente: Regular 400 normal está dataless no iCloud na origem fornecida. O manifesto lista os sete arquivos disponíveis. Até sua entrega, o navegador usa o peso real mais próximo (Medium 500) para o texto normal. Não há Regular renomeado ou fabricado. Ao baixar o OTF, converter e adicionar seu registro ao manifest.json.
