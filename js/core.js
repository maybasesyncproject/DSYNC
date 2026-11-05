// ===== HELPERS =====
function getData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}


function setData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Erro ao salvar localmente:', e);
    mostrarToast(
      '⚠️ Erro ao salvar (armazenamento cheio?)',
      'warning'
    );
    return;
  }

  // Não sincroniza configurações locais ou usuários locais.
  if (
    usuarioSupabase &&
    ![
      STORAGE_KEYS.usuarios
    ].includes(key)
  ) {
    agendarSalvamentoNuvem();
  }
}


function saveData() {
  if (!dadosCompartilhadosCarregados) return;

  setData(STORAGE_KEYS.produtos, state.produtos);
  setData(STORAGE_KEYS.prateleiras, state.prateleiras);
  setData(STORAGE_KEYS.carga, state.carga);
  setData(STORAGE_KEYS.historico, state.historico);
  setData(STORAGE_KEYS.pedidosSeparar, state.pedidosSeparar);
  setData(STORAGE_KEYS.pedidosFinalizados, state.pedidosFinalizados);
  setData(STORAGE_KEYS.injecao, state.injecao);
  setData(STORAGE_KEYS.injetando, state.injetando);
  setData(STORAGE_KEYS.injetados, state.injetados);
  setData(STORAGE_KEYS.materiaPrima, state.materiaPrima);
}

function salvarInsumos() {
  setData(STORAGE_KEYS.insumos, state.insumos);
  setData(STORAGE_KEYS.configInsumos, state.configInsumos);
  setData(STORAGE_KEYS.produtoInsumoMap, state.produtoInsumoMap);
}

function registrarHistorico(produtoNome, acao, quantidade, detalhes) {
  state.historico.unshift({
    produto: produtoNome, acao, quantidade, detalhes,
    data: new Date().toLocaleString()
  });
  if (state.historico.length > 1000) state.historico = state.historico.slice(0, 1000);
  setData(STORAGE_KEYS.historico, state.historico);
}

// ===== UNDO =====
function salvarEstadoParaUndo() {
  const snapshot = {
    produtos: JSON.parse(JSON.stringify(state.produtos)),
    prateleiras: JSON.parse(JSON.stringify(state.prateleiras)),
    carga: JSON.parse(JSON.stringify(state.carga)),
    historico: JSON.parse(JSON.stringify(state.historico)),
    insumos: JSON.parse(JSON.stringify(state.insumos)),
    configInsumos: JSON.parse(JSON.stringify(state.configInsumos)),
    produtoInsumoMap: JSON.parse(JSON.stringify(state.produtoInsumoMap)),
    pedidosSeparar: JSON.parse(JSON.stringify(state.pedidosSeparar)),
    pedidosFinalizados: JSON.parse(JSON.stringify(state.pedidosFinalizados)),
    injecao: JSON.parse(JSON.stringify(state.injecao)),
    injetando: JSON.parse(JSON.stringify(state.injetando)),
    injetados: JSON.parse(JSON.stringify(state.injetados)),
    materiaPrima: JSON.parse(JSON.stringify(state.materiaPrima)),
    pedidoCargaAtual: JSON.parse(JSON.stringify(state.pedidoCargaAtual))
  };
  state.undoStack.push(snapshot);
  if (state.undoStack.length > 50) state.undoStack.shift();
}

function desfazer() {
  if (state.undoStack.length === 0) { mostrarToast('Nada para desfazer', 'info'); return; }
  const s = state.undoStack.pop();
  state.produtos = s.produtos; state.prateleiras = s.prateleiras; state.carga = s.carga;
  state.historico = s.historico; state.insumos = s.insumos; state.configInsumos = s.configInsumos;
  state.produtoInsumoMap = s.produtoInsumoMap;
  state.pedidosSeparar = s.pedidosSeparar; state.pedidosFinalizados = s.pedidosFinalizados;
  state.injecao = s.injecao; state.injetando = s.injetando; state.injetados = s.injetados;
  state.materiaPrima = s.materiaPrima;
  if (s.pedidoCargaAtual) state.pedidoCargaAtual = s.pedidoCargaAtual;
  saveData(); salvarInsumos(); salvarPedidoCarga();
  atualizarTudo();
  renderizarInsumos(); atualizarListasPedidos();
  renderizarInjecao(); renderizarInjetar(); renderizarInjetando();
  renderizarInjetados(); renderizarMateriaPrima();
  atualizarPedidoCarga();
  mostrarToast('↩️ Ação desfeita', 'success');
}

function carregarDados() {
  state.produtos = getData(STORAGE_KEYS.produtos, []);
  state.prateleiras = getData(STORAGE_KEYS.prateleiras, []);
  state.carga = getData(STORAGE_KEYS.carga, []);
  state.historico = getData(STORAGE_KEYS.historico, []);
  state.usuarios = getData(STORAGE_KEYS.usuarios, []);
  state.limiteBaixo = getData(STORAGE_KEYS.limiteBaixo, 40);
  state.limiteCritico = getData(STORAGE_KEYS.limiteCritico, 0);
  state.pedidosSeparar = getData(STORAGE_KEYS.pedidosSeparar, []);
  state.pedidosFinalizados = getData(STORAGE_KEYS.pedidosFinalizados, []);
  state.injecao = getData(STORAGE_KEYS.injecao, []);
  state.injetando = getData(STORAGE_KEYS.injetando, []);
  state.injetados = getData(STORAGE_KEYS.injetados, []);
  state.materiaPrima = getData(STORAGE_KEYS.materiaPrima, { tipos: ['PP', 'PE', 'PET', 'PS', 'PVC', 'ECO'], estoque: {} });

  state.prateleiras = state.prateleiras.map(shelf => {
    const produtos = (shelf.produtos || []).map(prod => {
      if (prod.posicao && typeof prod.posicao === 'string') {
        const m = prod.posicao.match(/(\d+)$/);
        if (m) prod.posicao = m[1];
      }
      return prod;
    });
    return { ...shelf, numPosicoes: shelf.numPosicoes || 12, produtos };
  });

  state.carga = state.carga.map(item => ({
    uid: item.uid || ('c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
    id: item.id, quantidade: item.quantidade || 0,
    prateleira: item.prateleira || null, posicao: item.posicao || null,
    pedidoCodigo: item.pedidoCodigo || null
  }));

  state.produtos = state.produtos.map(p => {
    let pac = parseInt(p.pacotesPorVolume);
    if (isNaN(pac) || pac <= 0) { pac = 25; p.pacotesPorVolume = pac; }
    return p;
  });

  state.injetando = state.injetando.map(m => {
    if (!m.ultimoTick) m.ultimoTick = Date.now();
    if (typeof m.produzido !== 'number' || isNaN(m.produzido)) m.produzido = 0;
    return m;
  });

  atualizarCodigosPrateleiras();
  atualizarListasPedidos();
}