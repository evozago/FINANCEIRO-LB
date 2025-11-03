/**
 * Calcula o número de dias úteis (segunda a sexta) em um mês específico
 * @param ano Ano (ex: 2025)
 * @param mes Mês (1-12)
 * @returns Número de dias úteis no mês
 */
export function calcularDiasUteisNoMes(ano: number, mes: number): number {
  // Criar data do primeiro dia do mês
  const primeiroDia = new Date(ano, mes - 1, 1);
  
  // Criar data do último dia do mês
  const ultimoDia = new Date(ano, mes, 0);
  
  let diasUteis = 0;
  
  // Iterar por todos os dias do mês
  for (let dia = primeiroDia.getDate(); dia <= ultimoDia.getDate(); dia++) {
    const dataAtual = new Date(ano, mes - 1, dia);
    const diaSemana = dataAtual.getDay();
    
    // 0 = Domingo, 6 = Sábado
    // Contar apenas dias úteis (1-5 = Segunda a Sexta)
    if (diaSemana !== 0 && diaSemana !== 6) {
      diasUteis++;
    }
  }
  
  return diasUteis;
}
