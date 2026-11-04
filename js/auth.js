// ===== SUPABASE: LOGIN, CADASTRO E BACKUP =====


async function carregarTipoUsuario() {
  const { data, error } = await window.supabase.functions.invoke(
    'gerenciar-usuarios',
    { body: { action: 'meu_tipo' } }
  );

  if (error || data?.error ||
    !['admin', 'usuario'].includes(data?.tipo)) {
    throw new Error(
      data?.error || error?.message || 'Não foi possível verificar o acesso.'
    );
  }

  const nomeUsuario =
    usuarioSupabase.user_metadata?.nome ||
    usuarioSupabase.user_metadata?.display_name ||
    usuarioSupabase.user_metadata?.full_name ||
    usuarioSupabase.email;

  state.usuarioAtual = {
    id: usuarioSupabase.id,
    nome: nomeUsuario,
    tipo: data.tipo
  };
}

async function registrarLogAcesso(evento) {
  if (!window.supabase || !usuarioSupabase) return;

  const { data, error } = await window.supabase.functions.invoke(
    'gerenciar-usuarios',
    { body: { action: 'registrar', evento } }
  );

  if (error || data?.error) {
    console.error('Erro ao registrar acesso:', error, data);
  }
}


async function fazerLoginSupabase() {
  const email = document.getElementById('loginUsuario').value.trim();
  const senha = document.getElementById('loginSenha').value;
  const msg = document.getElementById('mensagemLogin');

  if (!email || !senha) {
    msg.textContent = '⚠️ Preencha e-mail e senha!';
    msg.style.display = 'block';
    return;
  }

  if (!window.supabase?.auth) {
    msg.textContent = '❌ Supabase não carregou. Aguarde e tente novamente.';
    msg.style.display = 'block';
    return;
  }

  const btn = document.querySelector(
    'button[onclick="fazerLoginSupabase()"]'
  );

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ Entrando...';
  }

  msg.style.display = 'none';

  try {
    const { data, error } = await window.supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) throw error;

    usuarioSupabase = data.user;

    await carregarTipoUsuario();
    await registrarLogAcesso('login');

    await carregarDaNuvem();
    await carregarPedidoCargaDaNuvem();

    entrarApp();

  } catch (err) {
    console.error('Erro no login:', err);
    msg.textContent = '❌ ' + (err.message || 'Erro de conexão.');
    msg.style.display = 'block';

    if (btn) {
      btn.disabled = false;
      btn.textContent = '🔓 Entrar';
    }
  }
}


async function criarConta() {
  const nome = document.getElementById('novoNome').value.trim();
  const email = document.getElementById('novoUsuario').value.trim();
  const senha = document.getElementById('novaSenha').value;
  const confirma = document.getElementById('confirmarSenha').value;
  const msg = document.getElementById('mensagemLogin');

  if (!nome || !email || !senha || !confirma) {
    msg.textContent = '⚠️ Preencha todos os campos!';
    msg.style.display = 'block';
    msg.style.color = '#e74c3c';
    return;
  }

  if (senha.length < 6) {
    msg.textContent = '⚠️ A senha deve ter pelo menos 6 caracteres!';
    msg.style.display = 'block';
    msg.style.color = '#e74c3c';
    return;
  }

  if (senha !== confirma) {
    msg.textContent = '❌ As senhas não coincidem!';
    msg.style.display = 'block';
    msg.style.color = '#e74c3c';
    return;
  }

  if (!window.supabase) {
    msg.textContent = '❌ Supabase não carregou.';
    msg.style.display = 'block';
    msg.style.color = '#e74c3c';
    return;
  }

  msg.textContent = '⏳ Criando conta...';
  msg.style.display = 'block';
  msg.style.color = '#3b82f6';

  const { data, error } = await window.supabase.auth.signUp({
    email: email,
    password: senha,
    options: {
      data: {
        nome: nome
      }
    }
  });

  if (error) {
    msg.textContent = '❌ ' + error.message;
    msg.style.display = 'block';
    msg.style.color = '#e74c3c';
    return;
  }

  msg.textContent =
    '✅ Conta criada! Verifique seu e-mail se a confirmação estiver ativa.';
  msg.style.display = 'block';
  msg.style.color = '#2ecc71';

  setTimeout(() => {
    mostrarLogin();

    document.getElementById('loginUsuario').value = email;

    msg.style.display = 'none';
    msg.style.color = '#e74c3c';
  }, 3000);
}

// ===== ENTRAR NO APP =====

async function entrarApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('appContent').style.display = 'block';

  document.getElementById('perfilUsuario').textContent =
    '👤 ' + (state.usuarioAtual?.nome || 'Usuário');

  document.getElementById('perfilNivel').textContent =
    state.usuarioAtual?.tipo === 'admin' ? '👑 Admin' : '👤 Usuário';

  document.getElementById('tabUsuarios').style.display =
    state.usuarioAtual?.tipo === 'admin' ? 'inline-block' : 'none';

  document.body.classList.remove(
    'tab-dashboard', 'tab-estoque', 'tab-pedidos',
    'tab-injecao', 'tab-usuarios'
  );
  document.body.classList.add('tab-dashboard');

  carregarTema();

  inicializarApp();

  // Inicia apenas o backup local automático.
  iniciarBackupAutomatico();
  iniciarTimerProducao();
}



async function fazerLogout() {
  try {
    await registrarLogAcesso('logout');

    if (window.supabase) {
      const { error } = await window.supabase.auth.signOut();
      if (error) console.error('Erro no logout:', error);
    }
  } catch (err) {
    console.error('Erro ao registrar logout:', err);
  }

  usuarioSupabase = null;
  localStorage.removeItem(STORAGE_KEYS.sessao);
  state.usuarioAtual = null;

  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('appContent').style.display = 'none';
}


function mostrarCriarConta() { document.getElementById('loginForm').style.display = 'none'; document.getElementById('criarContaForm').style.display = 'block'; document.getElementById('mensagemLogin').style.display = 'none'; }
function mostrarLogin() { document.getElementById('loginForm').style.display = 'block'; document.getElementById('criarContaForm').style.display = 'none'; document.getElementById('mensagemLogin').style.display = 'none'; }

function toggleSenha(id, el) {
  const i = document.getElementById(id);
  if (i.type === 'password') { i.type = 'text'; el.textContent = '🙈'; }
  else { i.type = 'password'; el.textContent = '👁️'; }
}

// ===== USUÁRIOS =====


async function carregarUsuarios() {
  const lista = document.getElementById('listaUsuarios');
  if (!lista) return;

  lista.innerHTML = '<div style="padding:12px">Carregando usuários...</div>';

  try {
    const { data, error } = await window.supabase.functions.invoke(
      'gerenciar-usuarios',
      { body: { action: 'listar' } }
    );

    if (error || !Array.isArray(data?.usuarios)) {
      console.error('Erro ao carregar usuários:', error, data);
      lista.innerHTML =
        '<div style="padding:12px">Erro ao carregar usuários. Verifique o Console.</div>';
      return;
    }

    const { data: sessionData } = await window.supabase.auth.getSession();
    const meuId = sessionData.session?.user?.id;

    lista.innerHTML = data.usuarios.map(u => `
      <div style="padding:8px;border-bottom:1px solid var(--border);color:var(--text)">
        <strong>${escapeHTML(u.nome || u.email || '')}</strong>
        <div>${escapeHTML(u.email || '')}</div>
        <span>${u.tipo === 'admin' ? '👑 Administrador' : '👤 Usuário'}</span>
        ${u.id !== meuId && u.tipo !== 'admin'
        ? `<button class="btn btn-xs btn-danger" onclick="removerUsuario('${u.id}')">🗑️ Remover</button>`
        : ''}
      </div>
    `).join('');
  } catch (err) {
    console.error('Falha ao carregar usuários:', err);
    lista.innerHTML =
      '<div style="padding:12px">Falha de comunicação com o Supabase.</div>';
  }
}

function abrirModalUsuario() {
  document.getElementById('editUsuarioNome').value = '';
  document.getElementById('editUsuarioEmail').value = '';
  document.getElementById('editUsuarioSenha').value = '';
  document.getElementById('editUsuarioTipo').value = 'usuario';
  document.getElementById('modalUsuario').style.display = 'flex';
}

async function salvarUsuario() {
  const nome = document.getElementById('editUsuarioNome').value.trim();
  const email = document.getElementById('editUsuarioEmail').value.trim();
  const senha = document.getElementById('editUsuarioSenha').value;
  const tipo = document.getElementById('editUsuarioTipo').value;

  if (!nome || !email || !senha) {
    mostrarToast('Preencha nome, e-mail e senha.', 'error');
    return;
  }

  if (senha.length < 6) {
    mostrarToast('A senha precisa ter pelo menos 6 caracteres.', 'error');
    return;
  }

  const btn = document.querySelector('#modalUsuario .btn-save');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Salvando...';
  }

  try {
    const { data, error } = await window.supabase.functions.invoke(
      'gerenciar-usuarios',
      {
        body: {
          action: 'criar',
          nome,
          email,
          senha,
          tipo
        }
      }
    );

    if (error || data?.error) {
      console.error('Erro ao criar usuário:', error, data);
      mostrarToast(data?.error || error?.message || 'Não foi possível criar o usuário.', 'error');
      return;
    }

    closeModalUsuario();
    await carregarUsuarios();
    mostrarToast('Usuário criado com sucesso!', 'success');
  } catch (err) {
    console.error(err);
    mostrarToast('Erro de comunicação com o Supabase.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Salvar';
    }
  }
}

async function removerUsuario(id) {
  if (!confirm('Tem certeza de que deseja excluir esta conta do Supabase?')) return;

  const { data, error } = await window.supabase.functions.invoke(
    'gerenciar-usuarios',
    { body: { action: 'remover', id } }
  );

  if (error || data?.error) {
    console.error('Erro ao remover usuário:', error, data);
    mostrarToast(data?.error || error?.message || 'Não foi possível remover o usuário.', 'error');
    return;
  }

  await carregarUsuarios();
  mostrarToast('Usuário removido com sucesso!', 'success');
}



async function carregarLogAcesso() {
  const c = document.getElementById('logAcessosContainer');
  if (!c) return;

  c.innerHTML = '<div style="padding:12px">Carregando log...</div>';

  try {
    const { data, error } = await window.supabase.functions.invoke(
      'gerenciar-usuarios',
      { body: { action: 'listar_logs' } }
    );

    if (error || data?.error) {
      console.error('Erro ao carregar log:', error, data);
      c.innerHTML = '<div style="padding:12px">Erro ao carregar o log.</div>';
      return;
    }

    const logs = data?.logs || [];

    if (!logs.length) {
      c.innerHTML = '<div style="text-align:center;padding:20px">Nenhum acesso registrado.</div>';
      return;
    }

    c.innerHTML = logs.map(log => `
      <div style="padding:8px;border-bottom:1px solid var(--border);color:var(--text);font-size:13px">
        <strong>${escapeHTML(log.email || 'Usuário')}</strong>
        — ${log.evento === 'login' ? 'Entrou' : 'Saiu'}
        <br>
        <small>${new Date(log.data).toLocaleString('pt-BR')}</small>
      </div>
    `).join('');
  } catch (err) {
    console.error('Falha ao carregar log:', err);
    c.innerHTML = '<div style="padding:12px">Falha de comunicação com o Supabase.</div>';
  }
}

async function limparLogAcesso() {
  if (!confirm('Tem certeza de que deseja apagar todo o log de acessos?')) return;

  try {
    const { data, error } = await window.supabase.functions.invoke(
      'gerenciar-usuarios',
      { body: { action: 'limpar_logs' } }
    );

    if (error || data?.error) {
      console.error('Erro ao limpar log:', error, data);
      mostrarToast(data?.error || error?.message || 'Não foi possível limpar o log.', 'error');
      return;
    }

    await carregarLogAcesso();
    mostrarToast('Log limpo com sucesso!', 'success');
  } catch (err) {
    console.error(err);
    mostrarToast('Erro de comunicação com o Supabase.', 'error');
  }
}

function closeModalUsuario() { document.getElementById('modalUsuario').style.display = 'none'; }
