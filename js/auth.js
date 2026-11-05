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