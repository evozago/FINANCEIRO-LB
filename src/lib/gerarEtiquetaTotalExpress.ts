import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

export interface DadosEtiqueta {
  // Destinatário
  dest_nome: string;
  dest_endereco: string;
  dest_numero: string;
  dest_complemento?: string;
  dest_bairro: string;
  dest_cidade: string;
  dest_estado: string;
  dest_cep: string;
  // Remetente
  rem_nome?: string;
  rem_endereco?: string;
  rem_cidade?: string;
  rem_estado?: string;
  rem_cep?: string;
  rem_cnpj?: string;
  // Dados do envio
  awb: string;
  rota?: string;
  pedido: string;
  volumes?: number;
  peso_kg?: number;
  tipo_servico?: string;
  data?: string;
  // NF-e
  nfe_numero?: string;
  // Peça
  peca?: string;
}

function formatarCep(cep: string): string {
  const c = cep.replace(/\D/g, '');
  return c.length === 8 ? `${c.slice(0, 5)}-${c.slice(5)}` : c;
}

function formatarData(data?: string): string {
  if (!data) {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }
  const [ano, mes, dia] = data.split('-');
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${dia}/${meses[parseInt(mes) - 1]}`;
}

function gerarCodigoBarrasSVG(codigo: string): string {
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, codigo, {
      format: 'CODE128',
      width: 2,
      height: 60,
      displayValue: false,
      margin: 0,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

export function gerarEtiquetaPDF(dados: DadosEtiqueta): void {
  // Etiqueta no formato 10cm x 15cm (landscape)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: [100, 150],
  });

  const W = 150; // largura total
  const H = 100; // altura total
  const margin = 4;

  // ===== BORDA EXTERNA =====
  doc.setLineWidth(0.5);
  doc.rect(margin, margin, W - margin * 2, H - margin * 2);

  // ===== LOGO / CABEÇALHO =====
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Express', margin + 2, margin + 6);

  // Tipo de serviço (STD / EXP)
  const tipoServico = dados.tipo_servico || 'STD';
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setDrawColor(0);
  doc.rect(W - margin - 22, margin + 1, 20, 10);
  doc.text(tipoServico, W - margin - 12, margin + 7, { align: 'center' });

  // ===== DESTINATÁRIO =====
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(`Dest.: ${dados.dest_nome}`, margin + 2, margin + 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const endLine = `${dados.dest_endereco}, ${dados.dest_numero}${dados.dest_complemento ? ' ' + dados.dest_complemento : ''}`;
  doc.text(endLine, margin + 2, margin + 19);
  doc.text(`Bairro: ${dados.dest_bairro}    CEP: ${formatarCep(dados.dest_cep)}`, margin + 2, margin + 23);
  doc.text(`Cidade: ${dados.dest_cidade}    Estado: ${dados.dest_estado}`, margin + 2, margin + 27);

  // ===== LINHA DIVISÓRIA =====
  doc.setLineWidth(0.3);
  doc.line(margin, margin + 30, W - margin, margin + 30);

  // ===== REMETENTE =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(`Rem.: ${dados.rem_nome || 'LUI BAMBINI'}`, margin + 2, margin + 34);
  doc.setFont('helvetica', 'normal');
  if (dados.rem_endereco) {
    doc.text(dados.rem_endereco, margin + 2, margin + 38);
  }
  const remCidadeEstado = `${dados.rem_cidade || 'Goiânia'} / ${dados.rem_estado || 'GO'}  ${formatarCep(dados.rem_cep || '74255220')}`;
  doc.text(remCidadeEstado, margin + 2, margin + 42);
  if (dados.rem_cnpj) {
    doc.text(`CNPJ: ${dados.rem_cnpj}`, margin + 2, margin + 46);
  }

  // ===== ROTA (destaque grande) =====
  if (dados.rota) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(dados.rota, margin + 2, margin + 56);
  }

  // ===== LINHA DIVISÓRIA =====
  doc.setLineWidth(0.3);
  doc.line(margin, margin + 59, W - margin, margin + 59);

  // ===== TABELA DE DADOS (direita) =====
  const tabelaX = W - margin - 55;
  const tabelaY = margin + 14;
  const linhaH = 6;
  const campos = [
    { label: 'NF',   valor: dados.nfe_numero || '-' },
    { label: 'PED',  valor: dados.pedido.replace(/\D/g, '') },
    { label: 'VOL',  valor: String(dados.volumes || 1) },
    { label: 'TP',   valor: dados.pedido.replace(/\D/g, '') },
    { label: 'DT',   valor: formatarData(dados.data) },
    { label: 'KG',   valor: dados.peso_kg ? dados.peso_kg.toFixed(3) : '0.500' },
    { label: 'PEÇA', valor: dados.peca || `1/${dados.volumes || 1}` },
  ];

  doc.setLineWidth(0.3);
  doc.rect(tabelaX, tabelaY - 4, 53, campos.length * linhaH + 1);

  campos.forEach((campo, i) => {
    const y = tabelaY + i * linhaH;
    // Linha divisória entre linhas
    if (i > 0) {
      doc.line(tabelaX, y - 3, tabelaX + 53, y - 3);
    }
    // Linha vertical entre label e valor
    doc.line(tabelaX + 12, tabelaY - 4, tabelaX + 12, tabelaY + campos.length * linhaH - 3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(campo.label, tabelaX + 1, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(campo.valor, tabelaX + 14, y);
  });

  // ===== CÓDIGO DE BARRAS =====
  const barcodeImg = gerarCodigoBarrasSVG(dados.awb);
  if (barcodeImg) {
    doc.addImage(barcodeImg, 'PNG', margin + 2, margin + 62, 80, 18);
  }

  // ===== AWB (texto vertical ao lado do código de barras) =====
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  // Texto "AWB" vertical
  doc.text('AWB', margin + 85, margin + 75, { angle: 90 });
  // AWB value vertical
  doc.setFontSize(6.5);
  doc.text(dados.awb, margin + 90, margin + 80, { angle: 90 });

  // ===== RODAPÉ =====
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const dataHora = new Date().toLocaleString('pt-BR');
  doc.text(`Impressão via Sistema - Total Express - ${dataHora}`, W / 2, H - margin - 1, { align: 'center' });

  // ===== LINHA PONTILHADA DE CORTE =====
  doc.setLineDashPattern([1, 1], 0);
  doc.setLineWidth(0.2);
  doc.line(margin, H - margin - 4, W - margin, H - margin - 4);
  doc.setLineDashPattern([], 0);

  // ===== ABRIR PARA IMPRESSÃO =====
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      win.print();
    };
  }
}
