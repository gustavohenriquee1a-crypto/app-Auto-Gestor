import React from 'react';
import { 
  X, 
  Car, 
  DollarSign, 
  Key, 
  Tag, 
  Building, 
  Wrench,
  ArrowRight,
  Sparkles,
  Compass,
  ClipboardCheck,
  Fuel
} from 'lucide-react';

interface ModalNovoLancamentoGlobalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectOption: (option: 'veiculo' | 'despesa-chassi' | 'abastecimento' | 'locacao' | 'despesa-fixa' | 'test-drive' | 'vistoria') => void;
}

export const ModalNovoLancamentoGlobal: React.FC<ModalNovoLancamentoGlobalProps> = ({
  isOpen,
  onClose,
  onSelectOption,
}) => {
  if (!isOpen) return null;

  const options = [
    {
      id: 'veiculo' as const,
      title: 'Cadastrar Novo Veículo (Por Chassi)',
      desc: 'Entrada de carro em estoque com chassi, placa, valor de compra e dados FIPE.',
      icon: Car,
      iconBg: 'bg-blue-600 text-white',
      badge: 'Estoque / Pátio',
    },
    {
      id: 'despesa-chassi' as const,
      title: 'Lançar Despesa / Preparação em Chassi',
      desc: 'Adicionar custo de peças, mão de obra, funilaria, IPVA ou frete diretamente ao veículo.',
      icon: DollarSign,
      iconBg: 'bg-orange-600 text-white',
      badge: 'Custo Incremental',
    },
    {
      id: 'abastecimento' as const,
      title: 'Registrar Abastecimento (Posto de Combustível)',
      desc: 'Lançar abastecimento com posto parceiro, litros, valor total, condutor e atualização de KM.',
      icon: Fuel,
      iconBg: 'bg-amber-600 text-white',
      badge: 'Combustível & Odômetro',
    },
    {
      id: 'test-drive' as const,
      title: 'Registrar Test Drive com Cliente',
      desc: 'Cadastro de motorista, controle de CNH e emissão do Termo de Responsabilidade.',
      icon: Compass,
      iconBg: 'bg-indigo-600 text-white',
      badge: 'Test Drive & Termo',
    },
    {
      id: 'vistoria' as const,
      title: 'Realizar Vistoria Digital de Entrada',
      desc: 'Checklist completo de lataria, pintura, motor, pneus e elétrica com emissão de laudo.',
      icon: ClipboardCheck,
      iconBg: 'bg-emerald-600 text-white',
      badge: 'Checklist & Laudo',
    },
    {
      id: 'locacao' as const,
      title: 'Novo Contrato de Locação (Driver de App)',
      desc: 'Locação semanal para motoristas Uber, 99 ou InDrive com controle de caução.',
      icon: Key,
      iconBg: 'bg-teal-600 text-white',
      badge: 'Recorrência Semanal',
    },
    {
      id: 'despesa-fixa' as const,
      title: 'Despesa Fixa da Empresa (DRE)',
      desc: 'Aluguel do pátio, folha salarial, contabilidade, energia ou plataformas.',
      icon: Building,
      iconBg: 'bg-purple-600 text-white',
      badge: 'DRE Consolidado',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        <div className="bg-[#16171f] text-white p-6 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-lg">Central de Lançamentos Rápidos</h3>
              <p className="text-xs text-slate-400">Escolha a operação que deseja realizar no sistema</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition cursor-pointer">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3 bg-[#0a0a0c] overflow-y-auto flex-1">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onClose();
                  onSelectOption(opt.id);
                }}
                className="w-full p-4 rounded-2xl border border-white/5 hover:border-blue-500/40 bg-[#111116] hover:bg-[#16171f] text-left transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${opt.iconBg}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">
                        {opt.title}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                        {opt.badge}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{opt.desc}</p>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-white/5 group-hover:bg-blue-600 group-hover:text-white text-slate-400 border border-white/5 transition ml-2 shrink-0">
                  <ArrowRight size={16} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
