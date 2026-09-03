import React from 'react';
import { 
  Clock, 
  Car, 
  AlertTriangle, 
  TrendingDown, 
  DollarSign, 
  Flame, 
  CheckCircle, 
  ArrowRight,
  ShieldAlert,
  Percent
} from 'lucide-react';
import { Veiculo, VendaVeiculo } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  formatKm, 
  calculateAging, 
  calculateCustoTotal,
  checkIsVeiculoVendido
} from '../utils/formatters';

interface AgingViewProps {
  veiculos: Veiculo[];
  vendas?: VendaVeiculo[];
  onOpenDossie: (veiculo: Veiculo) => void;
  onOpenVenda: (veiculo: Veiculo) => void;
}

export const AgingView: React.FC<AgingViewProps> = ({
  veiculos,
  vendas = [],
  onOpenDossie,
  onOpenVenda,
}) => {
  const veiculosAtivos = veiculos.filter((v) => !checkIsVeiculoVendido(v, vendas));

  // Categorize by aging ranges
  const greenVehicles = veiculosAtivos.filter(
    (v) => calculateAging(v.dataEntrada).faixa === '0-30'
  );
  const yellowVehicles = veiculosAtivos.filter(
    (v) => calculateAging(v.dataEntrada).faixa === '31-60'
  );
  const redVehicles = veiculosAtivos.filter(
    (v) => calculateAging(v.dataEntrada).faixa === '60+'
  );

  // Capital calculations
  const totalCapitalGreen = greenVehicles.reduce((s, v) => s + calculateCustoTotal(v), 0);
  const totalCapitalYellow = yellowVehicles.reduce((s, v) => s + calculateCustoTotal(v), 0);
  const totalCapitalRed = redVehicles.reduce((s, v) => s + calculateCustoTotal(v), 0);
  const totalCapitalGlobal = totalCapitalGreen + totalCapitalYellow + totalCapitalRed;

  // Opportunity cost calculation (assuming 1.2% monthly cost of idle capital / 0.04% per day)
  const custoCapitalMensalRed = totalCapitalRed * 0.012;

  // Average aging days
  const totalDias = veiculosAtivos.reduce(
    (s, v) => s + calculateAging(v.dataEntrada).dias,
    0
  );
  const mediaDiasPatio = veiculosAtivos.length > 0 ? Math.round(totalDias / veiculosAtivos.length) : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header KPIs & Cost of Idle Capital */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 shadow-none">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Média de Dias em Pátio</span>
          <h4 className="text-2xl font-black text-white mt-1">{mediaDiasPatio} dias</h4>
          <p className="text-xs text-slate-400 mt-1">Tempo médio de giro de estoque</p>
        </div>

        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 shadow-none">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Capital em Aging Crítico (+60d)</span>
          <h4 className="text-2xl font-black text-rose-400 mt-1">{formatCurrency(totalCapitalRed)}</h4>
          <p className="text-xs text-slate-400 mt-1">{redVehicles.length} veículos necessitando queima</p>
        </div>

        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 shadow-none">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Custo Financeiro Parado/mês</span>
          <h4 className="text-2xl font-black text-amber-400 mt-1">{formatCurrency(custoCapitalMensalRed)}</h4>
          <p className="text-xs text-slate-400 mt-1">Custo de oportunidade (1.2% a.m.)</p>
        </div>

        <div className="bg-[#111116] p-5 rounded-2xl border border-white/5 shadow-none">
          <span className="text-[11px] font-semibold uppercase text-slate-400">Eficiência de Giro (&lt;30d)</span>
          <h4 className="text-2xl font-black text-emerald-400 mt-1">
            {veiculosAtivos.length > 0 ? Math.round((greenVehicles.length / veiculosAtivos.length) * 100) : 0}%
          </h4>
          <p className="text-xs text-slate-400 mt-1">{greenVehicles.length} carros com margem máxima</p>
        </div>
      </div>

      {/* 2. Educational & Strategic Guidelines */}
      <div className="bg-[#111116] text-slate-200 p-5 rounded-2xl border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Clock className="text-blue-400" size={18} />
            <h4 className="font-bold text-white text-sm">Regras Estratégicas de Giro de Estoque por Aging</h4>
          </div>
          <p className="text-xs text-slate-400">
            Veículos com mais de 60 dias corroem a rentabilidade por depreciação e custo de oportunidade do capital.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
            🟢 0-30d: Margem Máxima
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
            🟡 31-60d: Impulsionar Anúncios
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 font-semibold">
            🔴 +60d: Queima / Giro de Capital
          </span>
        </div>
      </div>

      {/* 3. Three-Column Kanban / Aging Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* COLUNA 1: VERDE (0-30 dias) */}
        <div className="bg-[#111116] border border-emerald-500/20 rounded-2xl p-4 space-y-4 shadow-none">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                <h4 className="font-bold text-white text-sm">Giro Rápido (0-30 Dias)</h4>
              </div>
              <p className="text-[11px] text-emerald-400 mt-0.5">Margem Cheia e Lucro Máximo</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-extrabold text-xs rounded-full">
              {greenVehicles.length}
            </span>
          </div>

          <div className="text-xs text-slate-300 bg-[#16171f] p-2.5 rounded-xl border border-emerald-500/20 flex justify-between">
            <span>Capital Investido:</span>
            <strong className="text-white">{formatCurrency(totalCapitalGreen)}</strong>
          </div>

          <div className="space-y-3">
            {greenVehicles.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">Nenhum carro nesta faixa.</p>
            ) : (
              greenVehicles.map((v) => {
                const aging = calculateAging(v.dataEntrada);
                const custo = calculateCustoTotal(v);
                return (
                  <div
                    key={v.id}
                    onClick={() => onOpenDossie(v)}
                    className="bg-[#16171f] p-4 rounded-xl border border-white/5 hover:border-emerald-500/40 shadow-none cursor-pointer transition space-y-2 group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-slate-200 text-sm group-hover:text-blue-400 transition-colors">
                          {v.modelo}
                        </h5>
                        <p className="text-[11px] text-slate-400 font-mono">{v.placa}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {aging.dias} dias
                      </span>
                    </div>

                    <div className="text-xs pt-1 border-t border-white/5 flex justify-between text-slate-400">
                      <span>Custo Total:</span>
                      <strong className="text-slate-200">{formatCurrency(custo)}</strong>
                    </div>

                    <div className="pt-1 flex justify-between items-center text-[11px]">
                      <span className="text-emerald-400 font-medium">Entrada: {formatDate(v.dataEntrada)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDossie(v);
                        }}
                        className="text-blue-400 hover:text-blue-300 font-bold transition"
                      >
                        Dossiê →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA 2: AMARELO (31-60 dias) */}
        <div className="bg-[#111116] border border-amber-500/20 rounded-2xl p-4 space-y-4 shadow-none">
          <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500" />
                <h4 className="font-bold text-white text-sm">Atenção (31-60 Dias)</h4>
              </div>
              <p className="text-[11px] text-amber-400 mt-0.5">Ajustar Preço ou Impulsionar</p>
            </div>
            <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 font-extrabold text-xs rounded-full">
              {yellowVehicles.length}
            </span>
          </div>

          <div className="text-xs text-slate-300 bg-[#16171f] p-2.5 rounded-xl border border-amber-500/20 flex justify-between">
            <span>Capital Investido:</span>
            <strong className="text-white">{formatCurrency(totalCapitalYellow)}</strong>
          </div>

          <div className="space-y-3">
            {yellowVehicles.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-6">Nenhum carro nesta faixa.</p>
            ) : (
              yellowVehicles.map((v) => {
                const aging = calculateAging(v.dataEntrada);
                const custo = calculateCustoTotal(v);
                return (
                  <div
                    key={v.id}
                    onClick={() => onOpenDossie(v)}
                    className="bg-[#16171f] p-4 rounded-xl border border-white/5 hover:border-amber-500/40 shadow-none cursor-pointer transition space-y-2 group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-slate-200 text-sm group-hover:text-blue-400 transition-colors">
                          {v.modelo}
                        </h5>
                        <p className="text-[11px] text-slate-400 font-mono">{v.placa}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        {aging.dias} dias
                      </span>
                    </div>

                    <div className="text-xs pt-1 border-t border-white/5 flex justify-between text-slate-400">
                      <span>Custo Total:</span>
                      <strong className="text-slate-200">{formatCurrency(custo)}</strong>
                    </div>

                    <div className="pt-1 flex justify-between items-center text-[11px]">
                      <span className="text-amber-400 font-medium">Avaliar margem</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDossie(v);
                        }}
                        className="text-blue-400 hover:text-blue-300 font-bold transition"
                      >
                        Simular Venda →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA 3: VERMELHO (+60 dias - Crítico / Encalhado) */}
        <div className="bg-[#111116] border border-rose-500/30 rounded-2xl p-4 space-y-4 shadow-none">
          <div className="flex items-center justify-between pb-3 border-b border-rose-500/30">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                  <Flame size={16} className="text-rose-400" />
                  Crítico / Encalhado (+60 Dias)
                </h4>
              </div>
              <p className="text-[11px] text-rose-400 mt-0.5 font-medium">Ação Imediata: Queima / Giro</p>
            </div>
            <span className="px-2.5 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 font-extrabold text-xs rounded-full">
              {redVehicles.length}
            </span>
          </div>

          <div className="text-xs text-rose-300 bg-[#16171f] p-2.5 rounded-xl border border-rose-500/30 flex justify-between font-bold">
            <span>Capital Parado:</span>
            <span className="text-rose-400">{formatCurrency(totalCapitalRed)}</span>
          </div>

          <div className="space-y-3">
            {redVehicles.length === 0 ? (
              <p className="text-center text-xs text-emerald-400 font-medium py-6">
                Parabéns! Nenhum veículo com mais de 60 dias em pátio.
              </p>
            ) : (
              redVehicles.map((v) => {
                const aging = calculateAging(v.dataEntrada);
                const custo = calculateCustoTotal(v);
                return (
                  <div
                    key={v.id}
                    onClick={() => onOpenDossie(v)}
                    className="bg-[#16171f] p-4 rounded-xl border border-rose-500/30 hover:border-rose-500/60 shadow-none cursor-pointer transition space-y-2.5 group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-black text-slate-200 text-sm group-hover:text-rose-400 transition-colors">
                          {v.modelo}
                        </h5>
                        <p className="text-[11px] text-slate-400 font-mono">{v.placa}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                        {aging.dias} DIAS
                      </span>
                    </div>

                    <div className="text-xs pt-1 border-t border-white/5 space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Custo Total:</span>
                        <strong className="text-slate-200">{formatCurrency(custo)}</strong>
                      </div>
                      <div className="flex justify-between text-slate-500 text-[10px]">
                        <span>Entrada no Pátio:</span>
                        <span>{formatDate(v.dataEntrada)}</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between gap-2 border-t border-white/5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDossie(v);
                        }}
                        className="text-xs text-slate-400 hover:text-white font-semibold transition"
                      >
                        Ver Dossiê
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenVenda(v);
                        }}
                        className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-xs"
                      >
                        Queima / Vender
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
