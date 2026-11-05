
function usaEmbalagem40x50(produto) {
  if (!produto) return false;
  const config = state.produtoInsumoMap[produto.id];
  if (config && config.tipoEmbalagem) return config.tipoEmbalagem === '40x50';
  return autoDetectarEmbalagem(produto.nome) === '40x50';
}