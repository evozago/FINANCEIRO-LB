import React, { useState } from 'react';

interface FiltrosAvancadosProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: any) => void;
  contasBancarias?: any[];
}

export function FiltrosAvancados({ open, onOpenChange, onApplyFilters, contasBancarias = [] }: FiltrosAvancadosProps) {
  const [filtros, setFiltros] = useState({
    status: '',
    credor: '',
    filial: '',
    contaBancaria: '',
    categoria: '',
    dataVencimentoDe: '',
    dataVencimentoAte: '',
    valorMin: '',
    valorMax: ''
  });

  const handleApplyFilters = () => {
    onApplyFilters(filtros);
    onOpenChange(false);
  };

  const handleClearFilters = () => {
    setFiltros({
      status: '',
      credor: '',
      filial: '',
      contaBancaria: '',
      categoria: '',
      dataVencimentoDe: '',
      dataVencimentoAte: '',
      valorMin: '',
      valorMax: ''
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Filtros Avançados</h2>
          <button 
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select 
              value={filtros.status} 
              onChange={(e) => setFiltros({...filtros, status: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="vencido">Vencido</option>
            </select>
          </div>

          {/* Credor */}
          <div>
            <label className="block text-sm font-medium mb-1">Credor</label>
            <select 
              value={filtros.credor} 
              onChange={(e) => setFiltros({...filtros, credor: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos os credores</option>
              <option value="marisol">Marisol Vestuário SA MSL - SC</option>
              <option value="deywson">DEYWSON GOMES DE MOURA</option>
              <option value="belanora">Belanora Roupas para Sonhar</option>
              <option value="mundo-kids">MUNDO KIDS LTDA</option>
              <option value="grendene">GRENDENE S/A - FILIAL 5 (FOR)</option>
              <option value="mon-sucre">MON SUCRE CONFECCOES LTDA</option>
              <option value="kyly">KYLY INDUSTRIA TEXTIL LTDA</option>
            </select>
          </div>

          {/* Filial */}
          <div>
            <label className="block text-sm font-medium mb-1">Filial</label>
            <select 
              value={filtros.filial} 
              onChange={(e) => setFiltros({...filtros, filial: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Todas as filiais</option>
              <option value="lui-bambini">Lui Bambini</option>
              <option value="nao-definida">Não definida</option>
            </select>
          </div>

          {/* Conta Bancária */}
          <div>
            <label className="block text-sm font-medium mb-1">Conta Bancária</label>
            <select 
              value={filtros.contaBancaria} 
              onChange={(e) => setFiltros({...filtros, contaBancaria: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Todas as contas</option>
              {contasBancarias.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.banco} - {conta.agencia} - {conta.numero_conta}
                </option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium mb-1">Categoria</label>
            <select 
              value={filtros.categoria} 
              onChange={(e) => setFiltros({...filtros, categoria: e.target.value})}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">Todas as categorias</option>
              <option value="geral">Geral</option>
              <option value="energia">Energia</option>
              <option value="internet">Internet</option>
              <option value="telefone">Telefone</option>
              <option value="aluguel">Aluguel</option>
              <option value="fornecedores">Fornecedores</option>
              <option value="servicos">Serviços</option>
              <option value="material">Material</option>
              <option value="transporte">Transporte</option>
              <option value="impostos">Impostos</option>
            </select>
          </div>

          {/* Período de Vencimento */}
          <div>
            <label className="block text-sm font-medium mb-1">Período de Vencimento</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">De</label>
                <input
                  type="date"
                  value={filtros.dataVencimentoDe}
                  onChange={(e) => setFiltros({...filtros, dataVencimentoDe: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Até</label>
                <input
                  type="date"
                  value={filtros.dataVencimentoAte}
                  onChange={(e) => setFiltros({...filtros, dataVencimentoAte: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Faixa de Valor */}
          <div>
            <label className="block text-sm font-medium mb-1">Faixa de Valor</label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Mín.</label>
                <input
                  type="number"
                  placeholder="0,00"
                  value={filtros.valorMin}
                  onChange={(e) => setFiltros({...filtros, valorMin: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Máx.</label>
                <input
                  type="number"
                  placeholder="999999,99"
                  value={filtros.valorMax}
                  onChange={(e) => setFiltros({...filtros, valorMax: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-2 pt-4">
            <button 
              onClick={handleClearFilters}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Limpar
            </button>
            <button 
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
