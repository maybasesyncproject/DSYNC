const { STORAGE_KEYS, state, dadosCompartilhadosCarregados } = require("./script");

// ===== VÍNCULOS DE INJEÇÃO E 40x50 =====
function autoDetectarVinculo(nome) {
  if (!nome) return '';
  const map = [
    { test: /^1,0-/, valor: 'C1N' },
    { test: /^1,5-/, valor: 'C15N' },
    { test: /^2,0-/, valor: 'C2N' },
    { test: /^3,0-/, valor: 'C3N' },
    { test: /^CUNHA-/i, valor: 'CUNHA(V)' },
    { test: /^♻️1,0-/, valor: 'C1E' },
    { test: /^♻️1,5-/, valor: 'C15E' },
    { test: /^♻️2,0-/, valor: 'C2E' },
    { test: /^♻️3,0-/, valor: 'C3E' },
    { test: /^♻️CUNHA-/i, valor: 'CUNHA(E)' }
  ];
  for (const m of map) if (m.test.test(nome)) return m.valor;
  return '';
}

function autoDetectarEmbalagem(nome) {
  const n = (nome || '').toLowerCase();
  if (n.includes('kit')) return '40x50';
  if (/-(500|200)$/.test(nome || '')) return '40x50';
  return 'individual';
}

function getVinculosInjecao(produto) {
  if (!produto) return [];
  const nome = (produto.nome || '').toLowerCase();
  if (nome.includes('kit')) {
    return [
      { injetado: 'C2N', multiplicador: 1 },
      { injetado: 'CUNHA(V)', multiplicador: 0.2 }
    ];
  }
  if (produto.injecaoVinculo) {
    return [{ injetado: produto.injecaoVinculo, multiplicador: 1 }];
  }
  return [];
}

function descontarInjetadosPorFamilia(produto, quantidadeCaixas) {
  if (!produto) return 0;
  const vinculos = getVinculosInjecao(produto);
  if (vinculos.length === 0) return 0;
  let total = 0;
  vinculos.forEach(v => {
    let resto = quantidadeCaixas * v.multiplicador;
    if (resto <= 0) return;
    const regs = state.injetados
      .filter(i => i.nome === v.injetado || i.codigoExtra === v.injetado)
      .sort((a, b) => new Date(a.data) - new Date(b.data));
    for (const r of regs) {
      if (resto <= 0) break;
      const d = Math.min(r.quantidade, resto);
      r.quantidade -= d;
      resto -= d;
      total += d;
    }
  });
  state.injetados = state.injetados.filter(i => i.quantidade > 0);
  saveData();
  renderizarInjetados();
  return total;
}

function migrarProdutosParaInjecao() {
  let alterou = false;
  state.produtos.forEach(p => {
    if (p.injecaoVinculo === undefined) {
      p.injecaoVinculo = autoDetectarVinculo(p.nome);
      alterou = true;
    }
    if (!state.produtoInsumoMap[p.id]) {
      state.produtoInsumoMap[p.id] = {
        modeloCaixa: 'A',
        embalagemPorCaixa: p.pacotesPorVolume || 25,
        tipoEmbalagem: autoDetectarEmbalagem(p.nome)
      };
      alterou = true;
      return;
    }
    const config = state.produtoInsumoMap[p.id];
    if (!config.tipoEmbalagem) { config.tipoEmbalagem = autoDetectarEmbalagem(p.nome); alterou = true; }
    if (!config.modeloCaixa) { config.modeloCaixa = 'A'; alterou = true; }
    if (!config.embalagemPorCaixa || isNaN(parseInt(config.embalagemPorCaixa))) {
      config.embalagemPorCaixa = p.pacotesPorVolume || 25; alterou = true;
    }
  });
  if (alterou) { setData(STORAGE_KEYS.produtos, state.produtos); salvarInsumos(); }
}

