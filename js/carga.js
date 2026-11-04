// ===== PEDIDO DE CARGA PERSISTENTE =====
function salvarPedidoCarga() {
  localStorage.setItem(
    STORAGE_KEYS.pedidoCarga,
    JSON.stringify(state.pedidoCargaAtual)
  );

  if (dadosCompartilhadosCarregados && usuarioSupabase) {
    salvarPedidoCargaNaNuvem();
  }
}

async function salvarPedidoCargaNaNuvem() {
  if (!window.supabase || !usuarioSupabase) {
    console.error('Usuário não autenticado.');
    return false;
  }

  const pedido = JSON.parse(
    JSON.stringify(state.pedidoCargaAtual || {
      ativo: false,
      codigo: '',
      itens: {}
    })
  );

  try {
    const { data, error } = await window.supabase
      .from('dsync_pedido_carga')
      .update({
        data: pedido,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select('id')
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      throw new Error('Registro do pedido não encontrado.');
    }

    console.log('☁️ Pedido de carga salvo:', pedido.codigo);
    return true;

  } catch (erro) {
    console.error('Erro ao salvar pedido de carga:', erro);
    mostrarToast('❌ Erro ao salvar pedido na nuvem!', 'error');
    return false;
  }
}
async function carregarPedidoCargaDaNuvem() {
  if (!window.supabase || !usuarioSupabase) {
    console.error('Usuário não autenticado.');
    return false;
  }

  try {
    const { data, error } = await window.supabase
      .from('dsync_pedido_carga')
      .select('data')
      .eq('id', 1)
      .single();

    if (error) throw error;

    state.pedidoCargaAtual = data.data || {
      ativo: false,
      codigo: '',
      itens: {}
    };

    localStorage.setItem(
      STORAGE_KEYS.pedidoCarga,
      JSON.stringify(state.pedidoCargaAtual)
    );

    console.log(
      '☁️ Pedido de carga carregado:',
      state.pedidoCargaAtual.codigo
    );

    return true;

  } catch (erro) {
    console.error('Erro ao carregar pedido de carga:', erro);
    mostrarToast('❌ Erro ao carregar pedido da nuvem!', 'error');
    return false;
  }
}

function carregarPedidoCarga() {
  const salvo = getData(STORAGE_KEYS.pedidoCarga, null);
  if (!salvo || typeof salvo !== 'object') return;
  if (salvo.ativo !== undefined && salvo.itens !== undefined) {
    state.pedidoCargaAtual = salvo;
    if (!state.pedidoCargaAtual.itens) state.pedidoCargaAtual.itens = {};
  } else {
    const itens = {};
    Object.values(salvo).forEach(item => {
      if (item && item.produtoId) {
        itens[item.produtoId] = {
          produtoId: item.produtoId,
          nome: item.nome,
          codigoInterno: item.codigoInterno || '',
          quantidadePedida: item.quantidade || 0,
          quantidadeProduzida: 0
        };
      }
    });
    state.pedidoCargaAtual = { ativo: Object.keys(itens).length > 0, codigo: '', itens };
  }
}

function getReservadoCargaAtual(pid) {
  return state.carga.filter(c => c.id === pid && c.pedidoCodigo === CARGA_PEDIDO_TAG)
    .reduce((a, c) => a + c.quantidade, 0);
}

function getFaltaCargaAtual(item) {
  const reservado = getReservadoCargaAtual(item.produtoId);
  const produzido = item.quantidadeProduzida || 0;
  return Math.max(0, item.quantidadePedida - reservado - produzido);
}

function isProdutoNaCargaAtual(pid) {
  return state.pedidoCargaAtual.ativo && state.pedidoCargaAtual.itens && state.pedidoCargaAtual.itens[pid];
}

function tentarAutoReservarCarga(pid, shelfId, posicao, quantidadeAdicionada) {
  if (!isProdutoNaCargaAtual(pid)) return 0;
  const item = state.pedidoCargaAtual.itens[pid];
  const falta = getFaltaCargaAtual(item);
  if (falta <= 0) return 0;
  const reservar = Math.min(quantidadeAdicionada, falta);
  if (reservar <= 0) return 0;
  state.carga.push({
    uid: 'c_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    id: pid, quantidade: reservar, prateleira: shelfId,
    posicao: posicao.toString(), pedidoCodigo: CARGA_PEDIDO_TAG
  });
  return reservar;
}


document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
    const alvo = e.target;
    const dentroDeCampo = alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.isContentEditable);
    if (dentroDeCampo) return;
    e.preventDefault();
    desfazer();
  }
});

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function () {
  console.log('🚀 Inicializando D.Sync...');

  // Oculta as telas enquanto verifica a sessão
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContent').style.display = 'none';

  carregarDados();
  carregarInsumos();
  carregarPedidoCarga();

  // Recupera sessão do Supabase
  if (window.supabase?.auth) {
    window.supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        console.error('Erro ao recuperar sessão:', error);
      }

      const session = data?.session;

      if (session) {
        usuarioSupabase = session.user;

        await carregarTipoUsuario();

        console.log('✅ Sessão restaurada:', session.user.email);

        await carregarDaNuvem();
        await carregarPedidoCargaDaNuvem();

        entrarApp();

      } else {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('appContent').style.display = 'none';
      }
    }).catch((erro) => {
      console.error('Erro ao verificar sessão:', erro);
    });

  } else {
    console.error('Supabase ainda não foi carregado.');
  }
});
