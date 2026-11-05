
// Salvar dados na nuvem

async function salvarNaNuvem() {
  if (!window.supabase || !usuarioSupabase) {
    mostrarToast('❌ Faça login para salvar na nuvem!', 'error');
    return;
  }

  const dados = {
    produtos: state.produtos || [],
    prateleiras: state.prateleiras || [],
    carga: state.carga || [],
    historico: state.historico || [],
    insumos: state.insumos || {
      embalagens: {},
      caixaModeloA: 0,
      caixaModeloB: 0,
      embalagem40x50: 0
    },
    configInsumos: state.configInsumos || {},
    produtoInsumoMap: state.produtoInsumoMap || {},
    pedidosSeparar: state.pedidosSeparar || [],
    pedidosFinalizados: state.pedidosFinalizados || [],
    injecao: state.injecao || [],
    injetando: state.injetando || [],
    injetados: state.injetados || [],
    materiaPrima: state.materiaPrima || {
      tipos: [],
      estoque: {}
    }


  };

  try {
    const { data: registroAtualizado, error } = await window.supabase
      .from('dsync_compartilhado')
      .update({
        data: dados,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Erro ao salvar dados compartilhados:', error);
      mostrarToast('❌ Erro ao salvar na nuvem!', 'error');
      return;
    }

    if (!registroAtualizado) {
      console.error('Nenhum registro encontrado com id = 1.');
      mostrarToast('❌ Registro compartilhado não encontrado!', 'error');
      return;
    }

    console.log('☁️ Dados compartilhados salvos com sucesso!');
    console.log('📦 Pedido de carga salvo:', dados.pedidoCargaAtual);

    mostrarToast('☁️ Dados compartilhados salvos!', 'success');

    const el = document.getElementById('ultimoBackupNuvem');

    if (el) {
      el.textContent = new Date().toLocaleString('pt-BR');
    }

  } catch (erro) {
    console.error('Erro inesperado ao salvar na nuvem:', erro);
    mostrarToast('❌ Falha inesperada ao salvar na nuvem!', 'error');
  }
}

let temporizadorSalvamento = null;
let salvamentoEmAndamento = false;
let salvamentoPendente = false;
let dadosCompartilhadosCarregados = false;


function agendarSalvamentoNuvem() {
  if (!usuarioSupabase || !dadosCompartilhadosCarregados) return;

  clearTimeout(temporizadorSalvamento);

  temporizadorSalvamento = setTimeout(async () => {
    if (salvamentoEmAndamento) {
      salvamentoPendente = true;
      return;
    }

    salvamentoEmAndamento = true;

    try {
      do {
        salvamentoPendente = false;

        if (!dadosCompartilhadosCarregados) break;

        await salvarNaNuvem();
      } while (salvamentoPendente);
    } catch (erro) {
      console.error('Erro no salvamento automático:', erro);
      mostrarToast(
        '⚠️ Não foi possível salvar na nuvem. Verifique sua conexão.',
        'warning'
      );
    } finally {
      salvamentoEmAndamento = false;

      if (salvamentoPendente && dadosCompartilhadosCarregados) {
        salvamentoPendente = false;
        agendarSalvamentoNuvem();
      }
    }
  }, 1000);
}



// Carregar dados da nuvem

async function carregarDaNuvem() {
  if (!window.supabase || !usuarioSupabase) return;
  dadosCompartilhadosCarregados = false;
  const { data: registro, error } = await window.supabase
    .from('dsync_compartilhado')
    .select('data')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao carregar dados compartilhados:', error);
    mostrarToast('❌ Erro ao carregar dados da nuvem!', 'error');
    return;
  }

  if (!registro || !registro.data) {
    console.log('Nenhum dado compartilhado encontrado.');
    return;
  }

  const dados = registro.data;

  state.produtos = dados.produtos || [];
  state.prateleiras = dados.prateleiras || [];
  state.carga = dados.carga || [];
  state.historico = dados.historico || [];

  state.insumos = dados.insumos || {
    embalagens: {},
    caixaModeloA: 0,
    caixaModeloB: 0,
    embalagem40x50: 0
  };

  state.configInsumos = dados.configInsumos || {};
  state.produtoInsumoMap = dados.produtoInsumoMap || {};
  state.pedidosSeparar = dados.pedidosSeparar || [];
  state.pedidosFinalizados = dados.pedidosFinalizados || [];
  state.injecao = dados.injecao || [];
  state.injetando = dados.injetando || [];
  state.injetados = dados.injetados || [];
  state.materiaPrima = dados.materiaPrima || { tipos: [], estoque: {} };
  state.pedidoCargaAtual = dados.pedidoCargaAtual || null;

  if (typeof atualizarTudo === 'function') {
    atualizarTudo();

  }
  dadosCompartilhadosCarregados = true;
  console.log('✅ Dados compartilhados prontos para sincronização.');
}
