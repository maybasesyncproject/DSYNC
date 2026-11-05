function exportarCargaPDF() {
  const pedido = state.pedidoCargaAtual;

  if (!pedido || !pedido.ativo || !pedido.itens ||
      Object.keys(pedido.itens).length === 0) {
    mostrarToast('❌ Não existe pedido para exportar!', 'error');
    return;
  }

  if (typeof window.jspdf === 'undefined') {
    mostrarToast('❌ Biblioteca jsPDF não encontrada!', 'error');
    console.error('jsPDF não está carregada.');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const itens = Object.values(pedido.itens);

  const totalPedido = itens.reduce(
    (total, item) => total + (Number(item.quantidadePedida) || 0),
    0
  );

  const totalProduzido = itens.reduce(
    (total, item) => total + (Number(item.quantidadeProduzida) || 0),
    0
  );

  const dataHora = new Date().toLocaleString('pt-BR');

  doc.setFontSize(18);
  doc.text('PEDIDO DE CARGA', 14, 18);

  doc.setFontSize(11);
  doc.text(`Código: ${pedido.codigo || 'Sem código'}`, 14, 27);
  doc.text(`Exportado em: ${dataHora}`, 14, 34);

  const linhas = itens.map(item => [
    item.nome || '',
    item.codigoInterno || '',
    Number(item.quantidadePedida) || 0,
    Number(item.quantidadeProduzida) || 0,
    (Number(item.quantidadePedida) || 0) -
      (Number(item.quantidadeProduzida) || 0)
  ]);

  if (typeof doc.autoTable !== 'function') {
    mostrarToast('❌ Biblioteca AutoTable não encontrada!', 'error');
    console.error('jsPDF AutoTable não está carregada.');
    return;
  }

  doc.autoTable({
    startY: 42,
    head: [[
      'Produto',
      'Código interno',
      'Qtd. pedida',
      'Qtd. produzida',
      'Falta produzir'
    ]],
    body: linhas,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 4
    },
    headStyles: {
      fillColor: [40, 90, 140],
      textColor: 255
    }
  });

  const finalY = doc.lastAutoTable.finalY + 10;

  doc.setFontSize(11);
  doc.text(`Total pedido: ${totalPedido}`, 14, finalY);
  doc.text(`Total produzido: ${totalProduzido}`, 85, finalY);
  doc.text(
    `Total restante: ${totalPedido - totalProduzido}`,
    165,
    finalY
  );

  doc.save(`Pedido_Carga_${pedido.codigo || 'sem_codigo'}.pdf`);

  mostrarToast('✅ PDF exportado com sucesso!', 'success');
}


function exportarInsumosPDF() {
  if (!state || !state.insumos) {
    mostrarToast('❌ Dados de insumos não encontrados!', 'error');
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    mostrarToast('❌ Biblioteca jsPDF não encontrada!', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const produtos = Array.isArray(state.produtos)
    ? state.produtos
    : [];

  const insumos = state.insumos || {};
  const configs = state.configInsumos || {};
  const mapa = state.produtoInsumoMap || {};

  doc.setFontSize(18);
  doc.text('RELATÓRIO DE ESTOQUE DE INSUMOS', 14, 18);

  doc.setFontSize(10);
  doc.text(
    `Data da exportação: ${new Date().toLocaleString('pt-BR')}`,
    14,
    26
  );

  // Resumo dos estoques
  doc.autoTable({
    startY: 33,
    head: [['Insumo', 'Estoque atual', 'Limite de alerta', 'Situação']],
    body: [
      [
        'Caixas Modelo A',
        insumos.caixaModeloA || 0,
        configs.alertaCaixaModeloA ?? 0,
        (insumos.caixaModeloA || 0) <=
          (configs.alertaCaixaModeloA ?? 0) ? 'ESTOQUE BAIXO' : 'Normal'
      ],
      [
        'Caixas Modelo B',
        insumos.caixaModeloB || 0,
        configs.alertaCaixaModeloB ?? 0,
        (insumos.caixaModeloB || 0) <=
          (configs.alertaCaixaModeloB ?? 0) ? 'ESTOQUE BAIXO' : 'Normal'
      ],
      [
        'Embalagem 40x50',
        insumos.embalagem40x50 || 0,
        configs.alertaEmbalagem40x50 ?? 0,
        (insumos.embalagem40x50 || 0) <=
          (configs.alertaEmbalagem40x50 ?? 0) ? 'ESTOQUE BAIXO' : 'Normal'
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [40, 90, 140], textColor: 255 }
  });

  // Tabela por produto
  const linhas = produtos.map(p => {
    const config = mapa[p.id] || {
      modeloCaixa: 'A',
      embalagemPorCaixa: 25,
      tipoEmbalagem: 'individual'
    };

    const usa40 = typeof usaEmbalagem40x50 === 'function'
      ? usaEmbalagem40x50(p)
      : false;

    const estoque = usa40
      ? (insumos.embalagem40x50 || 0)
      : (insumos.embalagens?.[p.id] || 0);

    const alerta = usa40
      ? (configs.alertaEmbalagem40x50 ?? 0)
      : (
          configs.alertaEmbalagemPorProduto?.[p.id] ??
          configs.alertaEmbalagemPadrao ??
          0
        );

    return [
      p.nome || '',
      config.modeloCaixa || 'A',
      usa40 ? '40x50' : 'Individual',
      config.embalagemPorCaixa ?? 25,
      estoque,
      alerta,
      estoque <= alerta ? 'ESTOQUE BAIXO' : 'Normal'
    ];
  });

  const inicioTabela = doc.lastAutoTable.finalY + 10;

  doc.autoTable({
    startY: inicioTabela,
    head: [[
      'Produto',
      'Caixa',
      'Embalagem',
      'Emb./cx',
      'Estoque',
      'Alerta',
      'Situação'
    ]],
    body: linhas,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [40, 90, 140], textColor: 255 },
    didParseCell: function(data) {
      if (
        data.section === 'body' &&
        data.column.index === 6 &&
        data.cell.raw === 'ESTOQUE BAIXO'
      ) {
        data.cell.styles.textColor = [200, 0, 0];
        data.cell.styles.fontStyle = 'bold';
      }
    }
  });

  doc.save('Relatorio_Estoque_Insumos.pdf');

  mostrarToast('✅ PDF de insumos exportado!', 'success');
}
