import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  query,
  orderBy,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import {
  Veiculo,
  VendaVeiculo,
  DespesaFixa,
  ProfissaoCadastrada,
  FornecedorPrestador,
  BancoParceiro,
  ConfiguracaoLoja,
  ContaBancariaCaixa,
  ConferenciaSaldoBancario,
  MovimentacaoConta,
  DespesaVeiculo,
  CategoriaFornecedor,
  CategoriaDespesa,
  PagadorPreCadastro,
  PagamentoAluguel,
  ContratoLocacao,
  LancamentoContaMotorista,
  ComissaoDetalhadaVenda,
  SnapshotConfirmacaoTacComissao,
  RegraRemuneracao,
} from '../types';
import { initialVeiculos, initialVendas, initialDespesasFixas } from '../data/initialData';

const COLLECTIONS = {
  VEICULOS: 'veiculos',
  VENDAS: 'vendas',
  DESPESAS_FIXAS: 'despesasFixas',
  PROFISSOES: 'profissoes',
  MARCAS: 'marcas',
  CORES: 'cores',
  FORNECEDORES: 'fornecedores',
  BANCOS: 'bancos',
  CONFIGURACOES: 'configuracoes_loja',
  CONTAS_BANCARIAS: 'contas_bancarias',
  MOVIMENTACOES_CONTAS: 'movimentacoes_contas',
  PAGADORES: 'pagadores',
  USUARIOS: 'usuarios',
};

/**
 * Converte de forma resiliente qualquer formato de data (Timestamp, Date, string ISO, objeto)
 * para uma string segura 'YYYY-MM-DD', prevenindo quebras de renderização e erros de .startsWith()
 */
export function normalizeDateString(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toISOString().split('T')[0];
      } catch {
        // fallback
      }
    }
    if ('seconds' in val && typeof val.seconds === 'number') {
      try {
        return new Date(val.seconds * 1000).toISOString().split('T')[0];
      } catch {
        // fallback
      }
    }
    if (val instanceof Date) {
      try {
        return isNaN(val.getTime()) ? '' : val.toISOString().split('T')[0];
      } catch {
        // fallback
      }
    }
  }
  return String(val || '');
}

// Lista base padrão de bancos parceiros / financeiras
export const DEFAULT_BANCOS: BancoParceiro[] = [
  {
    id: 'banco-santander-fin',
    razaoSocial: 'Aymoré Crédito, Financiamento e Investimento S.A.',
    nomeFantasia: 'Santander Financiamentos',
    cnpj: '07.707.650/0001-10',
    codigoLojista: 'SANT-88210',
    nomeGerente: 'Rodrigo Alcantara',
    telefone: '(11) 3004-5454',
    whatsapp: '11988776655',
    email: 'rodrigo.gerente@santander.com.br',
    linkPortal: 'https://www.santanderfinanciamentos.com.br/lojista',
    domicilioBancario: 'Agência: 0033 | C/C: 13004589-2 | PIX: 07707650000110',
    taxaRetornoPadrao: 2.5,
    status: 'Ativo',
    observacoes: 'Aprovações rápidas e excelente retorno TAC com seguro prestamista embutido.',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'banco-bv-financeira',
    razaoSocial: 'Banco Votorantim S.A.',
    nomeFantasia: 'BV Financeira',
    cnpj: '01.858.774/0001-10',
    codigoLojista: 'BV-LOJ-4432',
    nomeGerente: 'Fernanda Meireles',
    telefone: '(11) 3003-1616',
    whatsapp: '11977665544',
    email: 'fernanda.meireles@bv.com.br',
    linkPortal: 'https://www.meubv.com.br/parceiro-lojista',
    domicilioBancario: 'Agência: 0001 | C/C: 445890-1 | PIX: financeiro@autogestor.com.br',
    taxaRetornoPadrao: 3.0,
    status: 'Ativo',
    observacoes: 'Aceita veículos mais antigos (até 15 anos) e scoring flexível para autônomos.',
    createdAt: '2026-01-12T11:00:00Z',
  },
  {
    id: 'banco-itau-auto',
    razaoSocial: 'Itaú Unibanco S.A.',
    nomeFantasia: 'Itaú Auto & Financiamento',
    cnpj: '60.701.190/0001-04',
    codigoLojista: 'ITAU-7741',
    nomeGerente: 'Marcelo Pires',
    telefone: '(11) 4004-4828',
    whatsapp: '11966554433',
    email: 'marcelo.pires@itau-unibanco.com.br',
    linkPortal: 'https://www.itau.com.br/veiculos/lojistas',
    domicilioBancario: 'Agência: 1245 | C/C: 98712-4 | PIX: 60701190000104',
    taxaRetornoPadrao: 2.0,
    status: 'Ativo',
    observacoes: 'Melhores taxas de juros para clientes correntistas e frotas.',
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'banco-bradesco-fin',
    razaoSocial: 'Banco Bradesco Financiamentos S.A.',
    nomeFantasia: 'Bradesco Financiamentos',
    cnpj: '07.207.996/0001-50',
    codigoLojista: 'BRAD-0932',
    nomeGerente: 'Juliana Castro',
    telefone: '(11) 4004-4433',
    whatsapp: '11955443322',
    email: 'juliana.castro@bradesco.com.br',
    linkPortal: 'https://www.bradescofinanciamentos.com.br',
    domicilioBancario: 'Agência: 0542 | C/C: 23100-8 | PIX: 07207996000150',
    taxaRetornoPadrao: 2.2,
    status: 'Ativo',
    observacoes: 'Parceiro tradicional para financiamentos com débito em conta.',
    createdAt: '2026-01-18T14:00:00Z',
  },
  {
    id: 'banco-pan',
    razaoSocial: 'Banco Pan S.A.',
    nomeFantasia: 'Banco Pan',
    cnpj: '59.285.411/0001-13',
    codigoLojista: 'PAN-33190',
    nomeGerente: 'Thiago Martins',
    telefone: '(11) 4002-7799',
    whatsapp: '11944332211',
    email: 'thiago.martins@bancopan.com.br',
    linkPortal: 'https://www.bancopan.com.br/parceiros',
    domicilioBancario: 'Agência: 0001 | C/C: 110992-3 | PIX: contato@autogestor.com.br',
    taxaRetornoPadrao: 3.5,
    status: 'Ativo',
    observacoes: 'Excelente aprovação para score médio/baixo e retorno de TAC alto com seguros.',
    createdAt: '2026-01-20T16:00:00Z',
  },
  {
    id: 'banco-safra-fin',
    razaoSocial: 'Banco Safra S.A.',
    nomeFantasia: 'Safra Financeira',
    cnpj: '58.160.789/0001-28',
    codigoLojista: 'SAFRA-5510',
    nomeGerente: 'Eduardo Vasconcelos',
    telefone: '(11) 3175-7575',
    whatsapp: '11933221100',
    email: 'eduardo.safra@safra.com.br',
    linkPortal: 'https://www.safrafinanceira.com.br/portal-lojista',
    domicilioBancario: 'Agência: 0070 | C/C: 77881-2 | PIX: 58160789000128',
    taxaRetornoPadrao: 2.0,
    status: 'Ativo',
    observacoes: 'Foco em veículos seminovos premium e ticket médio mais alto.',
    createdAt: '2026-01-22T10:00:00Z',
  },
];

// Lista base padrão de parceiros / fornecedores para facilitar o início da operação
export const DEFAULT_FORNECEDORES: FornecedorPrestador[] = [
  {
    id: 'forn-posto-combustivel-1',
    nome: 'Posto Ipiranga & Shell Rota 101',
    razaoSocial: 'Auto Posto & Conveniência Rota 101 Ltda',
    cnpjCpf: '11.222.333/0001-44',
    categoria: 'Posto de Combustível',
    telefone: '(11) 3214-5500',
    whatsapp: '11988887777',
    email: 'financeiro@postorota101.com.br',
    responsavelContato: 'Gerente Roberto',
    endereco: 'Av. das Nações Unidas, 1500',
    cidadeUf: 'São Paulo - SP',
    chavePix: '11222333000144',
    tipoChavePix: 'CNPJ',
    status: 'Ativo',
    observacoes: 'Posto conveniado para abastecimento de frota e estoque com faturamento quinzenal.',
    createdAt: '2026-01-05T08:00:00Z',
  },
  {
    id: 'forn-auto-mecanica-1',
    nome: 'Auto Mecânica Express & Injeção',
    razaoSocial: 'Auto Mecânica Express Ltda',
    cnpjCpf: '12.345.678/0001-90',
    categoria: 'Oficina Mecânica',
    telefone: '(11) 98765-4321',
    whatsapp: '11987654321',
    email: 'contato@mecanicaexpress.com.br',
    responsavelContato: 'Carlos Mecânico',
    endereco: 'Av. das Oficinas, 120 - Setor Automotivo',
    cidadeUf: 'São Paulo - SP',
    chavePix: '12345678000190',
    tipoChavePix: 'CNPJ',
    status: 'Ativo',
    observacoes: 'Parceiro para revisões mecânicas, freios, suspensão e motor.',
    createdAt: '2026-01-10T10:00:00Z',
  },
  {
    id: 'forn-funilaria-prime',
    nome: 'Funilaria & Pintura Prime Estufa',
    razaoSocial: 'Prime Reparos Automotivos ME',
    cnpjCpf: '23.456.789/0001-12',
    categoria: 'Funilaria e Pintura',
    telefone: '(11) 97654-3210',
    whatsapp: '11976543210',
    email: 'primefunilaria@gmail.com',
    responsavelContato: 'Marcos Funileiro',
    endereco: 'Rua dos Pintores, 45',
    cidadeUf: 'São Paulo - SP',
    chavePix: 'primefunilaria@gmail.com',
    tipoChavePix: 'E-mail',
    status: 'Ativo',
    observacoes: 'Pintura em estufa, martelinho de ouro e alinhamento de lataria.',
    createdAt: '2026-01-12T11:00:00Z',
  },
  {
    id: 'forn-estetica-detail',
    nome: 'Brilho Car Estética & Lava Jato',
    razaoSocial: 'Brilho Car Lavagem e Polimento ME',
    cnpjCpf: '34.567.890/0001-23',
    categoria: 'Lava Jato / Estética Automotiva',
    telefone: '(11) 96543-2109',
    whatsapp: '11965432109',
    responsavelContato: 'André Estética',
    endereco: 'Av. Principal, 500',
    cidadeUf: 'São Paulo - SP',
    chavePix: '11965432109',
    tipoChavePix: 'Telefone',
    status: 'Ativo',
    observacoes: 'Polimento técnico cristalizado, higienização interna e lavagem de motor.',
    createdAt: '2026-01-15T09:00:00Z',
  },
  {
    id: 'forn-auto-pecas-brasil',
    nome: 'Auto Peças & Distribuidora Brasil',
    razaoSocial: 'Distribuidora de Peças Brasil S.A.',
    cnpjCpf: '45.678.901/0001-34',
    categoria: 'Autopeças',
    telefone: '(11) 3322-1100',
    whatsapp: '11954321098',
    responsavelContato: 'Balcão de Atendimento',
    endereco: 'Rua do Comércio, 880',
    cidadeUf: 'São Paulo - SP',
    chavePix: '45678901000134',
    tipoChavePix: 'CNPJ',
    status: 'Ativo',
    observacoes: 'Fornecedor de peças originais e paralelas com faturamento mensal.',
    createdAt: '2026-01-18T14:00:00Z',
  },
];

// Lista base padrão de profissões no mercado automotivo
export const DEFAULT_PROFISSOES: string[] = [
  'Administrador(a)',
  'Advogado(a)',
  'Aposentado(a) / Pensionista',
  'Arquiteto(a) / Urbanista',
  'Autônomo(a) / Prestador de Serviços',
  'Bancário(a) / Finanças',
  'Comerciante / Lojista',
  'Contador(a) / Auditor(a)',
  'Dentista / Odontologista',
  'Desenvolvedor(a) / TI / Tech',
  'Empresário(a) / Produtor',
  'Enfermeiro(a) / Saúde',
  'Engenheiro(a)',
  'Farmacêutico(a)',
  'Fisioterapeuta',
  'Funcionário(a) CLT / Privado',
  'Mecânico(a) / Técnico Automotivo',
  'Médico(a)',
  'Motorista de Aplicativo / Uber / 99',
  'Motorista de Caminhão / Carreteiro',
  'Nutricionista',
  'Policial / Bombeiro / Militar',
  'Produtor(a) Rural / Agro',
  'Professor(a) / Educador(a)',
  'Psicólogo(a)',
  'Representante Comercial / Vendedor',
  'Servidor(a) Público(a) Municipal/Estadual/Federal',
  'Veterinário(a)',
  'Outra Profissão'
];

// --- Realtime Subscriptions ---

export function subscribeProfissoes(
  onData: (profissoes: string[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.PROFISSOES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const fromDb: string[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.nome && typeof data.nome === 'string' && data.nome.trim()) {
          fromDb.push(data.nome.trim());
        }
      });

      // Merge defaults + DB items sem duplicatas (case-insensitive)
      const map = new Map<string, string>();
      DEFAULT_PROFISSOES.forEach((p) => map.set(p.toLowerCase(), p));
      fromDb.forEach((p) => map.set(p.toLowerCase(), p));

      const sortedList = Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      onData(sortedList);
    },
    (err) => {
      console.error('Error fetching profissoes from Firestore:', err);
      // Fallback para lista padrão se houver erro ou offline
      onData(DEFAULT_PROFISSOES);
      if (onError) onError(err);
    }
  );
}

// Lista base padrão de Marcas / Montadoras no Brasil
export const DEFAULT_MARCAS: string[] = [
  'Audi',
  'BMW',
  'BYD',
  'CAOA Chery',
  'Chevrolet',
  'Citroën',
  'Fiat',
  'Ford',
  'GWM',
  'Honda',
  'Hyundai',
  'JAC Motors',
  'Jeep',
  'Kia',
  'Land Rover',
  'Mercedes-Benz',
  'Mini',
  'Mitsubishi',
  'Nissan',
  'Peugeot',
  'Porsche',
  'RAM',
  'Renault',
  'Suzuki',
  'Toyota',
  'Troller',
  'Volkswagen',
  'Volvo'
];

// Lista base padrão de Cores de veículos
export const DEFAULT_CORES: string[] = [
  'Amarelo',
  'Azul',
  'Bege',
  'Bordô',
  'Branco',
  'Bronze',
  'Chumbo',
  'Cinza',
  'Dourado',
  'Grafite',
  'Laranja',
  'Marrom',
  'Prata',
  'Preto',
  'Rosa',
  'Roxo',
  'Verde',
  'Vermelho',
  'Vinho'
];

/**
 * Escuta em tempo real a lista de Marcas de veículos sincronizadas
 */
export function subscribeMarcas(
  onData: (marcas: string[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.MARCAS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const fromDb: string[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.nome && typeof data.nome === 'string' && data.nome.trim()) {
          fromDb.push(data.nome.trim());
        }
      });

      const map = new Map<string, string>();
      DEFAULT_MARCAS.forEach((m) => map.set(m.toLowerCase(), m));
      fromDb.forEach((m) => map.set(m.toLowerCase(), m));

      const sortedList = Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      try {
        localStorage.setItem('autogestor_marcas_v1', JSON.stringify(sortedList));
      } catch (e) {
        // ignore
      }
      onData(sortedList);
    },
    (err) => {
      console.warn('Erro ao carregar marcas do Firestore, usando cache local/padrão:', err);
      try {
        const cached = localStorage.getItem('autogestor_marcas_v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onData(parsed);
            if (onError) onError(err);
            return;
          }
        }
      } catch (e) {
        // ignore
      }
      onData(DEFAULT_MARCAS);
      if (onError) onError(err);
    }
  );
}

/**
 * Escuta em tempo real a lista de Cores de veículos sincronizadas
 */
export function subscribeCores(
  onData: (cores: string[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.CORES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const fromDb: string[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.nome && typeof data.nome === 'string' && data.nome.trim()) {
          fromDb.push(data.nome.trim());
        }
      });

      const map = new Map<string, string>();
      DEFAULT_CORES.forEach((c) => map.set(c.toLowerCase(), c));
      fromDb.forEach((c) => map.set(c.toLowerCase(), c));

      const sortedList = Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      try {
        localStorage.setItem('autogestor_cores_v1', JSON.stringify(sortedList));
      } catch (e) {
        // ignore
      }
      onData(sortedList);
    },
    (err) => {
      console.warn('Erro ao carregar cores do Firestore, usando cache local/padrão:', err);
      try {
        const cached = localStorage.getItem('autogestor_cores_v1');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onData(parsed);
            if (onError) onError(err);
            return;
          }
        }
      } catch (e) {
        // ignore
      }
      onData(DEFAULT_CORES);
      if (onError) onError(err);
    }
  );
}

export function subscribeVeiculos(
  onData: (veiculos: Veiculo[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.VEICULOS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: Veiculo[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data?.() as any;
        if (data && (data.id || data.placa)) {
          const despesasNormalizadas = Array.isArray(data.despesas)
            ? data.despesas
                .filter((d: any) => d != null)
                .map((d: any, idx: number) => ({
                  ...d,
                  id: d?.id ? String(d.id) : `desp-${data.id || docSnap.id}-${idx}`,
                  data: normalizeDateString(d?.data),
                  dataVencimento: normalizeDateString(d?.dataVencimento),
                  dataPagamento: normalizeDateString(d?.dataPagamento),
                  valor: Number(d?.valor) || 0,
                }))
            : [];

          const historicoNormalizado = Array.isArray(data.historico)
            ? data.historico
                .filter((h: any) => h != null)
                .map((h: any) => ({
                  ...h,
                  data: normalizeDateString(h?.data),
                }))
            : [];

          items.push({
            ...data,
            id: data.id || docSnap.id,
            dataEntrada: normalizeDateString(data.dataEntrada),
            dataVenda: normalizeDateString(data.dataVenda),
            despesas: despesasNormalizadas,
            historico: historicoNormalizado,
          });
        }
      });
      // Sort newest first by dataEntrada
      items.sort((a, b) => {
        const timeA = a?.dataEntrada ? new Date(a.dataEntrada).getTime() : 0;
        const timeB = b?.dataEntrada ? new Date(b.dataEntrada).getTime() : 0;
        return timeB - timeA;
      });
      onData(items);
    },
    (err) => {
      console.warn('Sincronização de veículos operando em modo offline/cache:', err);
      try {
        const cached = localStorage.getItem('autogestor_veiculos');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onData(parsed);
          }
        }
      } catch (e) {
        // ignore
      }
      if (onError) onError(err);
    }
  );
}

export function subscribeVendas(
  onData: (vendas: VendaVeiculo[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.VENDAS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: VendaVeiculo[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data?.() as any;
        if (data && (data.id || data.placa)) {
          items.push({
            ...data,
            id: data.id || docSnap.id,
            dataVenda: normalizeDateString(data.dataVenda),
            dataRecebimento: normalizeDateString(data.dataRecebimento),
            comissaoDataPagamento: normalizeDateString(data.comissaoDataPagamento),
            valorVenda: Number(data.valorVenda) || 0,
            pagamentos: Array.isArray(data.pagamentos) ? data.pagamentos.filter((p: any) => p != null) : [],
          });
        }
      });
      items.sort((a, b) => {
        const timeA = a?.dataVenda ? new Date(a.dataVenda).getTime() : 0;
        const timeB = b?.dataVenda ? new Date(b.dataVenda).getTime() : 0;
        return timeB - timeA;
      });
      onData(items);
    },
    (err) => {
      console.warn('Sincronização de vendas operando em modo offline/cache:', err);
      try {
        const cached = localStorage.getItem('autogestor_vendas');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onData(parsed);
          }
        }
      } catch (e) {
        // ignore
      }
      if (onError) onError(err);
    }
  );
}

export function subscribeDespesasFixas(
  onData: (despesas: DespesaFixa[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.DESPESAS_FIXAS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: DespesaFixa[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data?.() as any;
        if (data && (data.id || data.descricao)) {
          items.push({
            ...data,
            id: data.id || docSnap.id,
            dataVencimento: normalizeDateString(data.dataVencimento),
            dataPagamento: normalizeDateString(data.dataPagamento),
            mesReferencia: normalizeDateString(data.mesReferencia),
            valor: Number(data.valor) || 0,
          });
        }
      });
      onData(items);
    },
    (err) => {
      console.warn('Sincronização de despesas fixas operando em modo offline/cache:', err);
      try {
        const cached = localStorage.getItem('autogestor_despesas_fixas');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onData(parsed);
          }
        }
      } catch (e) {
        // ignore
      }
      if (onError) onError(err);
    }
  );
}

export function subscribeFornecedores(
  onData: (fornecedores: FornecedorPrestador[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.FORNECEDORES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: FornecedorPrestador[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as FornecedorPrestador;
        if (data && (data.id || data.nome)) {
          items.push({
            ...data,
            id: data.id || docSnap.id,
          });
        }
      });

      // If DB is empty, provide default list
      if (items.length === 0) {
        onData(DEFAULT_FORNECEDORES);
      } else {
        // Sort by name
        items.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'));
        onData(items);
      }
    },
    (err) => {
      console.error('Error fetching fornecedores from Firestore:', err);
      onData(DEFAULT_FORNECEDORES);
      if (onError) onError(err);
    }
  );
}

export function subscribeBancos(
  onData: (bancos: BancoParceiro[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.BANCOS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: BancoParceiro[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as BancoParceiro;
        if (data && (data.id || data.nomeFantasia || data.razaoSocial)) {
          items.push({
            ...data,
            id: data.id || docSnap.id,
          });
        }
      });

      // If DB is empty, provide default list
      if (items.length === 0) {
        onData(DEFAULT_BANCOS);
      } else {
        // Sort by nomeFantasia
        items.sort((a, b) => (a.nomeFantasia || a.razaoSocial || '').localeCompare(b.nomeFantasia || b.razaoSocial || '', 'pt-BR'));
        onData(items);
      }
    },
    (err) => {
      console.error('Error fetching bancos from Firestore:', err);
      onData(DEFAULT_BANCOS);
      if (onError) onError(err);
    }
  );
}

// --- CRUD Mutations with Firestore ---

export async function saveBancoFirestore(banco: BancoParceiro): Promise<void> {
  const docRef = doc(db, COLLECTIONS.BANCOS, banco.id);
  const cleanData = JSON.parse(JSON.stringify(banco));
  await setDoc(docRef, cleanData, { merge: true });
}

export async function deleteBancoFirestore(bancoId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.BANCOS, bancoId);
  await deleteDoc(docRef);
}

export async function saveFornecedorFirestore(fornecedor: FornecedorPrestador): Promise<void> {
  const docRef = doc(db, COLLECTIONS.FORNECEDORES, fornecedor.id);
  const cleanData = JSON.parse(JSON.stringify(fornecedor));
  await setDoc(docRef, cleanData, { merge: true });
}

export async function deleteFornecedorFirestore(fornecedorId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.FORNECEDORES, fornecedorId);
  await deleteDoc(docRef);
}

// ---------------------------------------------------------------------------
// GESTÃO DE PAGADORES / MOTORISTAS PRÉ-CADASTRADOS (SEM CONTRATO ATIVO)
// ---------------------------------------------------------------------------
export async function getPagadoresFirestore(): Promise<PagadorPreCadastro[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTIONS.PAGADORES));
    const list: PagadorPreCadastro[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as PagadorPreCadastro);
    });
    if (list.length > 0) {
      localStorage.setItem('troca_facil_pagadores', JSON.stringify(list));
      return list;
    }
  } catch (err) {
    console.warn('Erro ao buscar pagadores no Firestore:', err);
  }
  const cached = localStorage.getItem('troca_facil_pagadores');
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch {
      // ignore
    }
  }
  return [];
}

export async function savePagadorFirestore(pagador: PagadorPreCadastro): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PAGADORES, pagador.id);
    const cleanData = JSON.parse(JSON.stringify(pagador));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (err) {
    console.warn('Erro ao gravar pagador no Firestore:', err);
  }
  try {
    const cached = localStorage.getItem('troca_facil_pagadores');
    const list: PagadorPreCadastro[] = cached ? JSON.parse(cached) : [];
    const idx = list.findIndex((p) => p.id === pagador.id);
    if (idx >= 0) list[idx] = pagador;
    else list.unshift(pagador);
    localStorage.setItem('troca_facil_pagadores', JSON.stringify(list));
  } catch {}
}

export async function deletePagadorFirestore(pagadorId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PAGADORES, pagadorId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Erro ao deletar pagador do Firestore:', err);
  }
  try {
    const cached = localStorage.getItem('troca_facil_pagadores');
    if (cached) {
      const list: PagadorPreCadastro[] = JSON.parse(cached).filter((p: any) => p.id !== pagadorId);
      localStorage.setItem('troca_facil_pagadores', JSON.stringify(list));
    }
  } catch {}
}

export function subscribePagadoresFirestore(
  onData: (pagadores: PagadorPreCadastro[]) => void
) {
  const colRef = collection(db, COLLECTIONS.PAGADORES);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: PagadorPreCadastro[] = [];
      snapshot.forEach((d) => {
        list.push({ ...d.data(), id: d.id } as PagadorPreCadastro);
      });
      localStorage.setItem('troca_facil_pagadores', JSON.stringify(list));
      onData(list);
    },
    (err) => {
      console.warn('Erro no onSnapshot de pagadores:', err);
      const cached = localStorage.getItem('troca_facil_pagadores');
      if (cached) {
        try {
          onData(JSON.parse(cached));
        } catch {}
      }
    }
  );
}

export async function saveVeiculoFirestore(veiculo: Veiculo): Promise<void> {
  const docRef = doc(db, COLLECTIONS.VEICULOS, veiculo.id);
  // Clean undefined properties before saving to firestore
  const cleanData: any = JSON.parse(JSON.stringify(veiculo));

  // Explicitly assign null to fields that were cleared so Firestore updates and removes old values
  if (veiculo.contratoAtivo === undefined || veiculo.contratoAtivo === null) {
    cleanData.contratoAtivo = null;
  }
  if (veiculo.fornecedorAtualId === undefined || veiculo.fornecedorAtualId === null) {
    cleanData.fornecedorAtualId = null;
  }
  if (veiculo.fornecedorAtualNome === undefined || veiculo.fornecedorAtualNome === null) {
    cleanData.fornecedorAtualNome = null;
  }
  if (veiculo.fornecedorAtualCategoria === undefined || veiculo.fornecedorAtualCategoria === null) {
    cleanData.fornecedorAtualCategoria = null;
  }
  if (veiculo.servicoAtualEmAndamento === undefined || veiculo.servicoAtualEmAndamento === null) {
    cleanData.servicoAtualEmAndamento = null;
  }
  if (veiculo.previsaoRetornoOficina === undefined || veiculo.previsaoRetornoOficina === null) {
    cleanData.previsaoRetornoOficina = null;
  }
  if (veiculo.custoEstimadoServico === undefined || veiculo.custoEstimadoServico === null) {
    cleanData.custoEstimadoServico = null;
  }

  await setDoc(docRef, cleanData, { merge: true });
}

export async function deleteVeiculoFirestore(veiculoId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.VEICULOS, veiculoId);
  await deleteDoc(docRef);
}

export async function saveVendaFirestore(venda: VendaVeiculo): Promise<void> {
  const docRef = doc(db, COLLECTIONS.VENDAS, venda.id);
  const cleanData = JSON.parse(JSON.stringify(venda));
  await setDoc(docRef, cleanData, { merge: true });
}

export async function deleteVendaFirestore(vendaId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.VENDAS, vendaId);
  await deleteDoc(docRef);
}

export async function saveDespesaFixaFirestore(despesa: DespesaFixa): Promise<void> {
  const docRef = doc(db, COLLECTIONS.DESPESAS_FIXAS, despesa.id);
  const cleanData = JSON.parse(JSON.stringify(despesa));
  await setDoc(docRef, cleanData, { merge: true });
}

export async function deleteDespesaFixaFirestore(despesaId: string): Promise<void> {
  const docRef = doc(db, COLLECTIONS.DESPESAS_FIXAS, despesaId);
  await deleteDoc(docRef);
}

export async function saveProfissaoFirestore(nome: string, criadoPor?: string): Promise<string> {
  const trimmed = nome.trim();
  if (!trimmed) return '';

  // Capitalizar primeira letra de cada palavra
  const nomeFormatado = trimmed
    .split(' ')
    .map((word) => word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase())
    .join(' ');

  // Gerar um ID determinístico e limpo para evitar duplicatas no Firestore
  const slug = 'prof_' + nomeFormatado
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');

  const docRef = doc(db, COLLECTIONS.PROFISSOES, slug);
  const data: ProfissaoCadastrada = {
    id: slug,
    nome: nomeFormatado,
    criadoPor: criadoPor || 'Equipe de Vendas',
    criadoEm: new Date().toISOString(),
  };

  await setDoc(docRef, data, { merge: true });
  return nomeFormatado;
}

/**
 * Salva uma nova Marca de veículo no Firestore
 */
export async function saveMarcaFirestore(nome: string, criadoPor?: string): Promise<string> {
  const trimmed = nome.trim();
  if (!trimmed) return '';

  const nomeFormatado = trimmed
    .split(' ')
    .map((word) => word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1) : word.toUpperCase())
    .join(' ');

  const slug = 'marca_' + nomeFormatado
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');

  const docRef = doc(db, COLLECTIONS.MARCAS, slug);
  const data = {
    id: slug,
    nome: nomeFormatado,
    criadoPor: criadoPor || 'Sistema',
    criadoEm: new Date().toISOString(),
  };

  await setDoc(docRef, data, { merge: true });
  return nomeFormatado;
}

/**
 * Salva uma nova Cor de veículo no Firestore
 */
export async function saveCorFirestore(nome: string, criadoPor?: string): Promise<string> {
  const trimmed = nome.trim();
  if (!trimmed) return '';

  const nomeFormatado = trimmed
    .split(' ')
    .map((word) => word.length > 2 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word.toLowerCase())
    .join(' ');

  const slug = 'cor_' + nomeFormatado
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_');

  const docRef = doc(db, COLLECTIONS.CORES, slug);
  const data = {
    id: slug,
    nome: nomeFormatado,
    criadoPor: criadoPor || 'Sistema',
    criadoEm: new Date().toISOString(),
  };

  await setDoc(docRef, data, { merge: true });
  return nomeFormatado;
}

// --- CRUD: Pagadores Pré-cadastrados (Locação & Frota) ---

/**
 * Salva ou atualiza um Pagador Pré-cadastrado no Firestore
 */
export async function savePagadorPreCadastroFirestore(pagador: PagadorPreCadastro): Promise<void> {
  const docRef = doc(db, COLLECTIONS.PAGADORES, pagador.id);
  const data = {
    ...pagador,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, data, { merge: true });
}

/**
 * Busca todos os pagadores pré-cadastrados no Firestore
 */
export async function buscarPagadoresPreCadastroFirestore(): Promise<PagadorPreCadastro[]> {
  try {
    const colRef = collection(db, COLLECTIONS.PAGADORES);
    const snap = await getDocs(colRef);
    const lista: PagadorPreCadastro[] = [];
    snap.forEach((d) => {
      lista.push({ ...d.data(), id: d.id } as PagadorPreCadastro);
    });
    return lista.sort((a, b) => new Date(b.dataCadastro || 0).getTime() - new Date(a.dataCadastro || 0).getTime());
  } catch (error) {
    console.warn('Aviso: Coleção pagadores ainda vazia ou inacessível no Firestore.', error);
    return [];
  }
}

/**
 * Deleta um pagador pré-cadastrado do Firestore
 */
export async function deletarPagadorPreCadastroFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.PAGADORES, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Erro ao deletar pagador pré-cadastrado:', error);
    throw error;
  }
}

// --- Limpeza Total de Dados Demonstrativos ---

export async function clearAllDemoDataFirestore(): Promise<void> {
  try {
    const batch = writeBatch(db);

    const [veiculosSnap, vendasSnap, despesasSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.VEICULOS)),
      getDocs(collection(db, COLLECTIONS.VENDAS)),
      getDocs(collection(db, COLLECTIONS.DESPESAS_FIXAS)),
    ]);

    veiculosSnap.forEach((d) => batch.delete(d.ref));
    vendasSnap.forEach((d) => batch.delete(d.ref));
    despesasSnap.forEach((d) => batch.delete(d.ref));

    await batch.commit();
    console.log('Todos os dados demonstrativos foram removidos com sucesso do Firestore.');
  } catch (error) {
    console.error('Erro ao limpar dados demonstrativos do Firestore:', error);
    throw error;
  }
}

// --- Auto-Seeding Helper (Desativado para manter banco limpo) ---

export async function checkAndSeedDatabaseIfEmpty(): Promise<boolean> {
  // Não insere dados fictícios automaticamente
  return false;
}

export async function restoreInitialDataFirestore(): Promise<void> {
  await clearAllDemoDataFirestore();
}

/**
 * Restaura um conjunto de dados a partir de um backup descriptografado
 */
export async function restoreDataToFirestore(
  backupData: {
    veiculos?: Veiculo[];
    vendas?: VendaVeiculo[];
    despesasFixas?: DespesaFixa[];
    profissoes?: string[];
  },
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ veiculosRestaurados: number; vendasRestauradas: number; despesasRestauradas: number }> {
  try {
    // 1. Se modo for replace, limpa coleções existentes antes
    if (mode === 'replace') {
      await clearAllDemoDataFirestore();
    }

    const batch = writeBatch(db);
    let vCount = 0;
    let sCount = 0;
    let dCount = 0;

    // Salvar Veículos
    if (backupData.veiculos && Array.isArray(backupData.veiculos)) {
      for (const v of backupData.veiculos) {
        if (v.id) {
          const docRef = doc(db, COLLECTIONS.VEICULOS, v.id);
          const clean = JSON.parse(JSON.stringify(v));
          batch.set(docRef, clean, { merge: true });
          vCount++;
        }
      }
    }

    // Salvar Vendas
    if (backupData.vendas && Array.isArray(backupData.vendas)) {
      for (const s of backupData.vendas) {
        if (s.id) {
          const docRef = doc(db, COLLECTIONS.VENDAS, s.id);
          const clean = JSON.parse(JSON.stringify(s));
          batch.set(docRef, clean, { merge: true });
          sCount++;
        }
      }
    }

    // Salvar Despesas Fixas
    if (backupData.despesasFixas && Array.isArray(backupData.despesasFixas)) {
      for (const d of backupData.despesasFixas) {
        if (d.id) {
          const docRef = doc(db, COLLECTIONS.DESPESAS_FIXAS, d.id);
          const clean = JSON.parse(JSON.stringify(d));
          batch.set(docRef, clean, { merge: true });
          dCount++;
        }
      }
    }

    // Salvar Profissões customizadas se existirem
    if (backupData.profissoes && Array.isArray(backupData.profissoes)) {
      for (const p of backupData.profissoes) {
        if (p && typeof p === 'string') {
          const slug = 'prof_' + p.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
          const docRef = doc(db, COLLECTIONS.PROFISSOES, slug);
          batch.set(docRef, {
            id: slug,
            nome: p,
            criadoPor: 'Backup Restore',
            criadoEm: new Date().toISOString()
          }, { merge: true });
        }
      }
    }

    await batch.commit();

    return {
      veiculosRestaurados: vCount,
      vendasRestauradas: sCount,
      despesasRestauradas: dCount,
    };
  } catch (error) {
    console.error('Erro ao restaurar backup no Firestore:', error);
    throw error;
  }
}

// =========================================================================
// 1. CONFIGURAÇÕES GLOBAIS DA LOJA (LOGOTIPO E DADOS INSTITUCIONAIS)
// =========================================================================

export const DEFAULT_CONFIGURACOES_LOJA: ConfiguracaoLoja = {
  id: 'geral',
  nomeLoja: 'Troca Fácil Veículos',
  razaoSocial: 'TROCA FÁCIL COMÉRCIO DE VEÍCULOS LTDA',
  cnpj: '47.271.452/0001-71',
  inscricaoEstadual: 'ISENTO',
  endereco: 'RUA NICOLAU CACCIATORI, 477, JD DOS PIONEIROS, CEP: 19.050-340, PRESIDENTE PRUDENTE-SP',
  logradouro: 'Rua Nicolau Cacciatori',
  numero: '477',
  bairro: 'Jd. dos Pioneiros',
  cep: '19050-340',
  cidadeUf: 'Presidente Prudente - SP',
  telefone: '(18) 3222-0000',
  email: 'contato@trocafacil.com.br',
  chavePixPadrao: '47.271.452/0001-71',
  responsavelLegal: 'Diretoria Executiva',
  cpfResponsavel: '000.000.000-00',
  logoUrl: '',
  comissaoGerenteAtiva: true,
  comissaoGerenteTipo: 'porcentagem_venda',
  comissaoGerenteTaxa: 1.0,
  comissaoGerenteBeneficiarioNome: 'Diretoria / Gestor Geral',
  comissaoGerenteObservacoes: 'Regra Global de Overriding da Loja (1% sobre valor da venda)',
};

/**
 * Busca pontual das configurações globais da loja (documento 'geral' na coleção 'configuracoes_loja')
 */
export async function getConfiguracaoLojaFirestore(): Promise<ConfiguracaoLoja> {
  try {
    const docRef = doc(db, COLLECTIONS.CONFIGURACOES, 'geral');
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return {
        ...DEFAULT_CONFIGURACOES_LOJA,
        ...(snap.data() as ConfiguracaoLoja),
        id: 'geral',
      };
    }
    // Checagem em 'loja_principal' caso tenha sido criado anteriormente
    const legSnap = await getDoc(doc(db, COLLECTIONS.CONFIGURACOES, 'loja_principal'));
    if (legSnap.exists() && legSnap.data()?.logoUrl) {
      const data = legSnap.data() as ConfiguracaoLoja;
      // Salva em 'geral' para consolidar
      await setDoc(docRef, { ...data, id: 'geral' }, { merge: true });
      return {
        ...DEFAULT_CONFIGURACOES_LOJA,
        ...data,
        id: 'geral',
      };
    }
  } catch (err) {
    console.warn('Erro ao carregar configuracoes_loja/geral:', err);
  }
  const cachedLogo = localStorage.getItem('troca_facil_logo') || '';
  return {
    ...DEFAULT_CONFIGURACOES_LOJA,
    logoUrl: cachedLogo || DEFAULT_CONFIGURACOES_LOJA.logoUrl,
    id: 'geral',
  };
}

/**
 * Escuta em tempo real as configurações globais da loja (incluindo o Logotipo Oficial no documento 'geral')
 */
export function subscribeConfiguracoesLoja(
  onData: (config: ConfiguracaoLoja) => void,
  onError?: (error: Error) => void
) {
  const docRef = doc(db, COLLECTIONS.CONFIGURACOES, 'geral');
  return onSnapshot(
    docRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ConfiguracaoLoja;
        onData({
          ...DEFAULT_CONFIGURACOES_LOJA,
          ...data,
          id: 'geral',
        });
      } else {
        // Fallback: verificar se existe no documento legado 'loja_principal'
        try {
          const legDoc = await getDoc(doc(db, COLLECTIONS.CONFIGURACOES, 'loja_principal'));
          if (legDoc.exists() && legDoc.data()?.logoUrl) {
            const legData = legDoc.data() as ConfiguracaoLoja;
            await setDoc(docRef, { ...legData, id: 'geral' }, { merge: true });
            onData({
              ...DEFAULT_CONFIGURACOES_LOJA,
              ...legData,
              id: 'geral',
            });
            return;
          }
        } catch (e) {
          // ignore
        }

        // Se ainda não existir documento no Firestore, checa cache local e retorna o padrão
        const cachedLogo = localStorage.getItem('troca_facil_logo') || '';
        onData({
          ...DEFAULT_CONFIGURACOES_LOJA,
          logoUrl: cachedLogo || DEFAULT_CONFIGURACOES_LOJA.logoUrl,
          id: 'geral',
        });
      }
    },
    (error) => {
      console.warn('Erro ao escutar configurações da loja no Firestore:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Salva ou atualiza as configurações da loja (Admin) no Firestore no documento global 'geral'
 */
export async function saveConfiguracaoLojaFirestore(
  config: Partial<ConfiguracaoLoja>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CONFIGURACOES, 'geral');
    const updateData: Partial<ConfiguracaoLoja> = {
      ...config,
      id: 'geral',
      updatedAt: new Date().toISOString(),
    };

    // Remove undefined values
    const clean = JSON.parse(JSON.stringify(updateData));
    await setDoc(docRef, clean, { merge: true });

    // Mantém sincronizado com 'loja_principal' para retrocompatibilidade
    try {
      await setDoc(doc(db, COLLECTIONS.CONFIGURACOES, 'loja_principal'), clean, { merge: true });
    } catch (e) {
      // ignore
    }

    // Atualiza cache local de backup
    if (config.logoUrl !== undefined) {
      if (config.logoUrl) {
        localStorage.setItem('troca_facil_logo', config.logoUrl);
      } else {
        localStorage.removeItem('troca_facil_logo');
      }
    }
  } catch (error) {
    console.error('Erro ao salvar configurações da loja no Firestore:', error);
    throw error;
  }
}

// =========================================================================
// 2. CONTAS BANCÁRIAS, CAIXAS & CAPITAL DE GIRO (ESTADO GLOBAL NO FIRESTORE)
// =========================================================================

export const DEFAULT_CONTAS_BANCARIAS: ContaBancariaCaixa[] = [
  {
    id: 'conta_itau_pj',
    nome: 'Banco Itaú PJ - Conta Corrente Principal',
    tipo: 'Conta Corrente PJ',
    banco: 'Itaú Unibanco',
    agencia: '0450',
    conta: '12345-6',
    chavePix: '47.271.452/0001-71',
    tipoChavePix: 'CNPJ',
    titular: 'TROCA FÁCIL COMÉRCIO DE VEÍCULOS LTDA',
    saldo: 150000,
    corTag: 'orange',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'conta_santander_fin',
    nome: 'Banco Santander PJ - Financiamentos & Giro',
    tipo: 'Conta Corrente PJ',
    banco: 'Santander',
    agencia: '0033',
    conta: '98765-4',
    chavePix: 'contato@trocafacil.com.br',
    tipoChavePix: 'E-mail',
    titular: 'TROCA FÁCIL COMÉRCIO DE VEÍCULOS LTDA',
    saldo: 85000,
    corTag: 'red',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'caixa_gaveta_loja',
    nome: 'Caixa Gaveta Loja (Dinheiro / Espécie)',
    tipo: 'Caixa Físico',
    saldo: 4500,
    corTag: 'emerald',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'fundo_reserva_garantia',
    nome: 'Fundo de Reserva Garantia 90d (CDC)',
    tipo: 'Fundo Garantia',
    saldo: 25000,
    corTag: 'indigo',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

/**
 * Normaliza um objeto de ContaBancariaCaixa do Firestore garantindo coerência entre
 * saldoConferido, saldoAtualOperacional, saldo e saldoAtual sem sobrescrever dados do banco
 */
export function normalizeContaBancaria(data: any, docId?: string): ContaBancariaCaixa {
  const id = docId || data.id || `conta_${Date.now()}`;
  // O saldo numérico base de referência
  const saldoBase = Number(data.saldoAtualOperacional ?? data.saldoAtual ?? data.saldo ?? 0);
  const saldoConferido = data.saldoConferido !== undefined && data.saldoConferido !== null 
    ? Number(data.saldoConferido) 
    : undefined;

  return {
    ...data,
    id,
    saldoConferido,
    dataHoraUltimaConferencia: data.dataHoraUltimaConferencia || undefined,
    saldoAtualOperacional: saldoBase,
    saldo: saldoBase,
    saldoAtual: saldoBase,
    historicoConferencias: Array.isArray(data.historicoConferencias) ? data.historicoConferencias : [],
  };
}

/**
 * Escuta em tempo real a lista de Contas Bancárias & Caixas no Firestore
 */
export function subscribeContasBancarias(
  onData: (contas: ContaBancariaCaixa[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.CONTAS_BANCARIAS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const contas = snapshot.docs
          .filter((docSnap) => docSnap != null && docSnap.exists())
          .map((docSnap) => normalizeContaBancaria(docSnap.data() || {}, docSnap.id));
        onData(contas);
      } else {
        // Se a coleção estiver vazia, apenas notifica array vazio ou cache local
        try {
          const localSaved = localStorage.getItem('autogestor_contas_bancarias');
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              onData(parsed.map(c => normalizeContaBancaria(c)));
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
        // Não popula automaticamente com DEFAULT_CONTAS_BANCARIAS em produção para não gerar dados falsos
        onData([]);
      }
    },
    (error) => {
      console.warn('Erro ao escutar contas bancárias no Firestore:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Salva ou atualiza uma Conta Bancária no Firestore garantindo espelhos persistidos
 */
export async function saveContaBancariaFirestore(
  conta: ContaBancariaCaixa
): Promise<void> {
  try {
    const id = conta.id || `conta_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const docRef = doc(db, COLLECTIONS.CONTAS_BANCARIAS, id);
    const saldoFinal = Number(conta.saldoAtualOperacional ?? conta.saldo ?? conta.saldoAtual ?? 0);

    const clean = JSON.parse(JSON.stringify({
      ...conta,
      id,
      saldoAtualOperacional: saldoFinal,
      saldo: saldoFinal,
      saldoAtual: saldoFinal,
      updatedAt: new Date().toISOString(),
    }));
    await setDoc(docRef, clean, { merge: true });
  } catch (error) {
    console.error('Erro ao salvar conta bancária no Firestore:', error);
    throw error;
  }
}

/**
 * Registra formalmente a Conferência de Saldo Bancário pelo Administrador
 * Este é o ÚNICO fluxo que define/atualiza saldoConferido e dataHoraUltimaConferencia.
 */
export async function registrarConferenciaSaldoBancarioFirestore(params: {
  contaId: string;
  saldoConferidoReal: number;
  dataHoraConferencia?: string;
  motivoAjuste?: string;
  usuarioId: string;
  usuarioNome: string;
}): Promise<ContaBancariaCaixa> {
  const { contaId, saldoConferidoReal, dataHoraConferencia, motivoAjuste, usuarioId, usuarioNome } = params;
  const docRef = doc(db, COLLECTIONS.CONTAS_BANCARIAS, contaId);
  const nowIso = dataHoraConferencia || new Date().toISOString();

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    if (!snap.exists()) {
      throw new Error(`Conta bancária ${contaId} não encontrada para conferência de saldo.`);
    }

    const data = snap.data();
    const saldoAnterior = Number(data.saldoAtualOperacional ?? data.saldo ?? 0);
    const diferenca = saldoConferidoReal - saldoAnterior;

    const novaConferencia: ConferenciaSaldoBancario = {
      id: `conf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      contaId,
      contaNome: data.nome || 'Conta',
      dataHoraConferencia: nowIso,
      saldoConferido: saldoConferidoReal,
      saldoAnterior,
      diferencaAjuste: diferenca,
      motivoAjuste: motivoAjuste || 'Conferência periódica de saldo real',
      usuarioId,
      usuarioNome,
      createdAt: new Date().toISOString(),
    };

    const historicoAtual = Array.isArray(data.historicoConferencias) ? data.historicoConferencias : [];
    const novoHistorico = [novaConferencia, ...historicoAtual];

    // Atualiza a conta com o novo ponto de corte e espelhos explícitos
    transaction.update(docRef, {
      saldoConferido: saldoConferidoReal,
      dataHoraUltimaConferencia: nowIso,
      saldoAtualOperacional: saldoConferidoReal,
      saldo: saldoConferidoReal,
      saldoAtual: saldoConferidoReal,
      historicoConferencias: novoHistorico,
      updatedAt: new Date().toISOString(),
    });

    // Se houve ajuste de saldo, registra a movimentação auditada de conciliação
    if (diferenca !== 0) {
      const movAjusteRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, `mov_ajuste_${novaConferencia.id}`);
      const movAjuste: MovimentacaoConta = {
        id: `mov_ajuste_${novaConferencia.id}`,
        idempotencyKey: `idemp_ajuste_conf_${novaConferencia.id}`,
        contaId,
        contaNome: data.nome || 'Conta',
        tipo: diferenca > 0 ? 'Receita' : 'Despesa',
        categoria: 'Ajuste de Conciliação Bancária',
        valor: Math.abs(diferenca),
        data: nowIso.split('T')[0],
        descricao: `[Ajuste de Conciliação] ${motivoAjuste || 'Conferência bancária'} (Dif: R$ ${diferenca.toFixed(2)})`,
        formaPagamento: 'Ajuste Contábil',
        criadoPor: usuarioNome,
        createdAt: nowIso,
        afetaSaldoAtual: false, // O saldo da conta já foi setado diretamente para saldoConferidoReal
        naturezaTemporal: 'ajuste_conciliacao',
        statusConciliacao: 'conciliado_saldo_conferido',
        tipoAjuste: 'Ajuste_Conciliacao',
      };
      transaction.set(movAjusteRef, movAjuste);
    }

    return normalizeContaBancaria({
      ...data,
      saldoConferido: saldoConferidoReal,
      dataHoraUltimaConferencia: nowIso,
      saldoAtualOperacional: saldoConferidoReal,
      saldo: saldoConferidoReal,
      saldoAtual: saldoConferidoReal,
      historicoConferencias: novoHistorico,
    }, contaId);
  });
}

/**
 * Remove uma Conta Bancária do Firestore
 */
export async function deleteContaBancariaFirestore(contaId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.CONTAS_BANCARIAS, contaId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Erro ao excluir conta bancária do Firestore:', error);
    throw error;
  }
}

// =========================================================================
// 3. TRANSAÇÕES / MOVIMENTAÇÕES BANCÁRIAS E EXTRATO GLOBAL (FIRESTORE)
// =========================================================================

/**
 * Escuta em tempo real o histórico de Movimentações / Extrato de Contas
 */
export function subscribeMovimentacoesContas(
  onData: (movs: MovimentacaoConta[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, COLLECTIONS.MOVIMENTACOES_CONTAS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const movs = snapshot.docs
        .filter((d) => d != null && d.exists())
        .map((d) => {
          const raw = (d.data() || {}) as any;
          return {
            ...raw,
            id: d.id,
            data: normalizeDateString(raw?.data),
            createdAt: normalizeDateString(raw?.createdAt) || new Date().toISOString(),
            valor: Number(raw?.valor) || 0,
          } as MovimentacaoConta;
        });

      // Ordenar por data mais recente primeiro
      movs.sort((a, b) => {
        const timeA = a?.createdAt || a?.data ? new Date(a.createdAt || a.data).getTime() : 0;
        const timeB = b?.createdAt || b?.data ? new Date(b.createdAt || b.data).getTime() : 0;
        return timeB - timeA;
      });
      onData(movs);
    },
    (error) => {
      console.warn('Erro ao escutar movimentações de contas no Firestore:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Registra uma nova movimentação / transação no extrato bancário
 */
export async function saveMovimentacaoContaFirestore(
  mov: MovimentacaoConta
): Promise<void> {
  try {
    const id = mov.id || `mov_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const docRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, id);
    const clean = JSON.parse(JSON.stringify({
      ...mov,
      id,
      createdAt: mov.createdAt || new Date().toISOString(),
    }));
    await setDoc(docRef, clean, { merge: true });
  } catch (error) {
    console.error('Erro ao salvar movimentação financeira no Firestore:', error);
    throw error;
  }
}

/**
 * Remove uma movimentação de conta do Firestore
 */
export async function deleteMovimentacaoContaFirestore(movId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, movId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Erro ao excluir movimentação de conta:', error);
    throw error;
  }
}

/**
 * =========================================================================
 * 3.1 TRANSFERÊNCIA ENTRE CONTAS (INTERNA OU TERCEIROS)
 * =========================================================================
 * - Debita o valor do saldo da Conta de Origem
 * - Se for conta interna, credita automaticamente o valor na Conta de Destino
 * - Se for para terceiros, debita da origem e registra com favorecido externo
 * - Gera registros detalhados no extrato de ambas as contas (ou da origem se terceiro)
 */
export interface ParametrosTransferencia {
  transferenciaId?: string;
  contaOrigemId: string;
  contaDestinoId?: string;
  isTerceiro: boolean;
  terceiroDestinoNome?: string;
  valor: number;
  data: string;
  motivo: string;
  usuarioNome?: string;
}

export async function executarTransferenciaEntreContasFirestore(
  params: ParametrosTransferencia
): Promise<{
  contaOrigemAtualizada: ContaBancariaCaixa;
  contaDestinoAtualizada?: ContaBancariaCaixa;
  movimentacaoOrigem: MovimentacaoConta;
  movimentacaoDestino?: MovimentacaoConta;
}> {
  const {
    transferenciaId,
    contaOrigemId,
    contaDestinoId,
    isTerceiro,
    terceiroDestinoNome,
    valor,
    data,
    motivo,
    usuarioNome = 'Sistema',
  } = params;

  if (!contaOrigemId) {
    throw new Error('A Conta de Origem é obrigatória.');
  }

  if (valor <= 0) {
    throw new Error('O valor da transferência deve ser maior que zero.');
  }

  if (!isTerceiro && !contaDestinoId) {
    throw new Error('A Conta de Destino é obrigatória para transferências internas.');
  }

  if (!isTerceiro && contaOrigemId === contaDestinoId) {
    throw new Error('A Conta de Origem e a Conta de Destino não podem ser a mesma.');
  }

  if (isTerceiro && (!terceiroDestinoNome || !terceiroDestinoNome.trim())) {
    throw new Error('Informe o nome ou instituição do terceiro favorecido.');
  }

  const idTransferencia = (transferenciaId && transferenciaId.trim())
    ? (transferenciaId.startsWith('transf_') ? transferenciaId : `transf_${transferenciaId}`)
    : `transf_${data || new Date().toISOString().split('T')[0]}_${contaOrigemId}_${contaDestinoId || 'terc'}_${valor}`;
  const dataMov = data || new Date().toISOString().split('T')[0];
  const nowIso = new Date().toISOString();

  const docOrigemRef = doc(db, COLLECTIONS.CONTAS_BANCARIAS, contaOrigemId);
  const docDestinoRef = (!isTerceiro && contaDestinoId) ? doc(db, COLLECTIONS.CONTAS_BANCARIAS, contaDestinoId) : null;
  const movDebRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, `mov_deb_${idTransferencia}`);

  return await runTransaction(db, async (transaction) => {
    // 1. Verificar idempotência da movimentação de débito ANTES de alterar qualquer saldo
    const movDebSnap = await transaction.get(movDebRef);
    if (movDebSnap.exists()) {
      console.log(`[Idempotência] Transferência ${idTransferencia} já processada anteriormente.`);
      const snapOrigemExisting = await transaction.get(docOrigemRef);
      const contaOrigemAtualizada = normalizeContaBancaria(snapOrigemExisting.exists() ? snapOrigemExisting.data() : {}, contaOrigemId);
      let contaDestinoAtualizada: ContaBancariaCaixa | undefined;
      if (docDestinoRef) {
        const snapDestinoExisting = await transaction.get(docDestinoRef);
        if (snapDestinoExisting.exists()) {
          contaDestinoAtualizada = normalizeContaBancaria(snapDestinoExisting.data(), contaDestinoId!);
        }
      }
      return {
        contaOrigemAtualizada,
        contaDestinoAtualizada,
        movimentacaoOrigem: movDebSnap.data() as MovimentacaoConta,
      };
    }

    // 2. Leitura das contas na transação
    const snapOrigem = await transaction.get(docOrigemRef);
    if (!snapOrigem.exists()) {
      throw new Error(`Conta bancária de origem ${contaOrigemId} não encontrada no Firestore.`);
    }

    let snapDestino = null;
    if (docDestinoRef) {
      snapDestino = await transaction.get(docDestinoRef);
      if (!snapDestino.exists()) {
        throw new Error(`Conta bancária de destino ${contaDestinoId} não encontrada no Firestore.`);
      }
    }

    const dataOrigem = snapOrigem.data();
    const saldoAnteriorOrigem = Number(dataOrigem.saldoAtualOperacional ?? dataOrigem.saldo ?? 0);
    const novoSaldoOrigem = saldoAnteriorOrigem - valor;

    // Atualiza conta de origem mantendo saldoConferido intacto e espelhos atualizados
    transaction.update(docOrigemRef, {
      saldoAtualOperacional: novoSaldoOrigem,
      saldo: novoSaldoOrigem,
      saldoAtual: novoSaldoOrigem,
      updatedAt: nowIso,
    });

    const contaOrigemAtualizada = normalizeContaBancaria({
      ...dataOrigem,
      saldoAtualOperacional: novoSaldoOrigem,
      saldo: novoSaldoOrigem,
      saldoAtual: novoSaldoOrigem,
    }, contaOrigemId);

    let contaDestinoAtualizada: ContaBancariaCaixa | undefined;
    if (docDestinoRef && snapDestino) {
      const dataDestino = snapDestino.data();
      const saldoAnteriorDestino = Number(dataDestino.saldoAtualOperacional ?? dataDestino.saldo ?? 0);
      const novoSaldoDestino = saldoAnteriorDestino + valor;

      transaction.update(docDestinoRef, {
        saldoAtualOperacional: novoSaldoDestino,
        saldo: novoSaldoDestino,
        saldoAtual: novoSaldoDestino,
        updatedAt: nowIso,
      });

      contaDestinoAtualizada = normalizeContaBancaria({
        ...dataDestino,
        saldoAtualOperacional: novoSaldoDestino,
        saldo: novoSaldoDestino,
        saldoAtual: novoSaldoDestino,
      }, contaDestinoId!);
    }

    // 3. Extrato Conta Origem (Débito / Saída)
    const descricaoOrigem = isTerceiro
      ? `Transferência para Terceiro: ${terceiroDestinoNome?.trim()} - Motivo: ${motivo.trim()}`
      : `Transferência enviada para ${contaDestinoAtualizada?.nome || 'Conta Destino'} - Motivo: ${motivo.trim()}`;

    const movimentacaoOrigem: MovimentacaoConta = {
      id: `mov_deb_${idTransferencia}`,
      idempotencyKey: `idemp_transf_deb_${idTransferencia}`,
      contaId: contaOrigemAtualizada.id,
      contaNome: contaOrigemAtualizada.nome,
      tipo: isTerceiro ? 'Despesa' : 'Transferência',
      categoria: isTerceiro ? 'Transferência para Terceiros' : 'Transferência Enviada',
      valor: valor,
      data: dataMov,
      descricao: descricaoOrigem,
      pagadorRecebedor: isTerceiro ? terceiroDestinoNome?.trim() : contaDestinoAtualizada?.nome,
      formaPagamento: 'Transferência Bancária / PIX',
      criadoPor: usuarioNome,
      createdAt: nowIso,
      transferenciaId: idTransferencia,
      contaOrigemId: contaOrigemAtualizada.id,
      contaOrigemNome: contaOrigemAtualizada.nome,
      contaDestinoId: isTerceiro ? undefined : contaDestinoAtualizada?.id,
      contaDestinoNome: isTerceiro ? undefined : contaDestinoAtualizada?.nome,
      isTerceiro,
      terceiroNome: isTerceiro ? terceiroDestinoNome?.trim() : undefined,
      motivo: motivo.trim(),
      tipoCusto: 'Neutro',
      categoriaCusto: 'Neutro',
      isTransferenciaInterna: !isTerceiro,
      isMovimentacaoNeutra: !isTerceiro,
      afetaSaldoAtual: true,
      naturezaTemporal: 'operacao_atual',
    };
    transaction.set(movDebRef, movimentacaoOrigem);

    // 3. Extrato Conta Destino (Crédito / Entrada, se interna)
    let movimentacaoDestino: MovimentacaoConta | undefined;
    if (!isTerceiro && contaDestinoAtualizada) {
      const descricaoDestino = `Transferência recebida de ${contaOrigemAtualizada.nome} - Motivo: ${motivo.trim()}`;
      const movCredRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, `mov_cred_${idTransferencia}`);

      movimentacaoDestino = {
        id: `mov_cred_${idTransferencia}`,
        idempotencyKey: `idemp_transf_cred_${idTransferencia}`,
        contaId: contaDestinoAtualizada.id,
        contaNome: contaDestinoAtualizada.nome,
        tipo: 'Transferência',
        categoria: 'Transferência Recebida',
        valor: valor,
        data: dataMov,
        descricao: descricaoDestino,
        pagadorRecebedor: contaOrigemAtualizada.nome,
        formaPagamento: 'Transferência Bancária / PIX',
        criadoPor: usuarioNome,
        createdAt: nowIso,
        transferenciaId: idTransferencia,
        contaOrigemId: contaOrigemAtualizada.id,
        contaOrigemNome: contaOrigemAtualizada.nome,
        contaDestinoId: contaDestinoAtualizada.id,
        contaDestinoNome: contaDestinoAtualizada.nome,
        isTerceiro: false,
        motivo: motivo.trim(),
        tipoCusto: 'Neutro',
        categoriaCusto: 'Neutro',
        isTransferenciaInterna: true,
        isMovimentacaoNeutra: true,
        afetaSaldoAtual: true,
        naturezaTemporal: 'operacao_atual',
      };
      transaction.set(movCredRef, movimentacaoDestino);
    }

    return {
      contaOrigemAtualizada,
      contaDestinoAtualizada,
      movimentacaoOrigem,
      movimentacaoDestino,
    };
  });
}

/**
 * =========================================================================
 * 4. INTEGRAÇÃO AUTOMÁTICA FINANCEIRA: VENDA -> SALDO BANCÁRIO & EXTRATO
 * =========================================================================
 * Ao concluir uma venda de veículo, esta função localiza as parcelas ou pagamentos
 * em PIX, TED, Dinheiro ou Entrada, credita automaticamente o saldo na conta bancária
 * selecionada e grava o registro detalhado no extrato / movimentações financeiras.
 */
export async function processarRecebimentoVendaFinanceiro(
  venda: VendaVeiculo,
  veiculo: Veiculo,
  usuarioNome: string = 'Sistema / Vendedor'
): Promise<void> {
  try {
    const pagamentosAReceber: Array<{
      pagamentoId: string;
      valor: number;
      forma: string;
      contaId: string;
      detalhes?: string;
    }> = [];

    // MODO HÍBRIDO
    if (venda.composicaoPagamento && venda.composicaoPagamento.length > 0) {
      venda.composicaoPagamento.forEach((p, idx) => {
        if (
          p.tipo === 'PIX' ||
          p.tipo === 'TED/Transferência' ||
          p.tipo === 'Dinheiro Espécie' ||
          p.tipo === 'Cartão de Crédito' ||
          p.tipo === 'Cartão de Débito'
        ) {
          const val = p.valorLiquido > 0 ? p.valorLiquido : p.valorBruto;
          const targetContaId = p.contaBancariaId || venda.contaBancariaDestinoId;
          const pagId = p.pagamentoId || p.id || `pag_${idx + 1}`;
          if (val > 0 && targetContaId) {
            pagamentosAReceber.push({
              pagamentoId: pagId,
              valor: val,
              forma: p.tipo,
              contaId: targetContaId,
              detalhes: p.detalhes,
            });
          }
        }
      });
    } else {
      // MODO SIMPLES
      if (venda.formaPagamento === 'À Vista PIX' || venda.formaPagamento === 'Dinheiro') {
        const targetContaId = venda.contaBancariaDestinoId;
        if (targetContaId && venda.valorVenda > 0) {
          pagamentosAReceber.push({
            pagamentoId: 'pag_vista',
            valor: venda.valorVenda,
            forma: venda.formaPagamento,
            contaId: targetContaId,
          });
        }
      } else if (venda.formaPagamento === 'Financiamento' || venda.formaPagamento === 'Troca + Volta') {
        if (venda.financiamentoDetalhes && venda.financiamentoDetalhes.valorEntrada > 0) {
          const targetContaId = venda.financiamentoDetalhes.contaDestinoEntrada || venda.contaBancariaDestinoId;
          if (targetContaId) {
            pagamentosAReceber.push({
              pagamentoId: 'pag_entrada_fin',
              valor: venda.financiamentoDetalhes.valorEntrada,
              forma: 'Entrada Financiamento (PIX/Transferência)',
              contaId: targetContaId,
            });
          }
        }
      }
    }

    if (pagamentosAReceber.length === 0) return;

    // Processar cada recebimento dentro de uma transação atômica e idempotente
    for (const pag of pagamentosAReceber) {
      const idempotencyKey = `idemp_venda_${venda.id}_pag_${pag.pagamentoId}`;
      const movId = `mov_venda_${venda.id}_${pag.pagamentoId}`;
      const docContaRef = doc(db, COLLECTIONS.CONTAS_BANCARIAS, pag.contaId);
      const docMovRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, movId);

      await runTransaction(db, async (transaction) => {
        // 1. Verificar idempotência determinística
        const movSnap = await transaction.get(docMovRef);
        if (movSnap.exists()) {
          console.log(`[Idempotência] Recebimento de venda ${venda.id} parcela ${pag.pagamentoId} já processado anteriormente.`);
          return;
        }

        const contaSnap = await transaction.get(docContaRef);
        if (!contaSnap.exists()) {
          throw new Error(`Conta bancária ${pag.contaId} não encontrada para receber venda ${venda.id}.`);
        }

        const dataConta = contaSnap.data();
        const saldoAnterior = Number(dataConta.saldoAtualOperacional ?? dataConta.saldo ?? 0);
        const novoSaldo = saldoAnterior + pag.valor;
        const nowIso = new Date().toISOString();

        // 2. Atualizar conta preservando saldoConferido intacto
        transaction.update(docContaRef, {
          saldoAtualOperacional: novoSaldo,
          saldo: novoSaldo,
          saldoAtual: novoSaldo,
          updatedAt: nowIso,
        });

        // 3. Criar a movimentação detalhada
        const novaMovimentacao: MovimentacaoConta = {
          id: movId,
          idempotencyKey,
          contaId: pag.contaId,
          contaNome: dataConta.nome || 'Conta',
          tipo: 'Receita',
          categoria: 'Venda de Veículo',
          valor: pag.valor,
          data: venda.dataVenda || nowIso.split('T')[0],
          descricao: `Recebimento de ${pag.forma} referente à venda do veículo ${veiculo.modelo || venda.modelo} - Placa: ${veiculo.placa || venda.placa} - Cliente: ${venda.compradorNome || 'Cliente'}`,
          vinculoVendaId: venda.id,
          veiculoId: veiculo.id || venda.veiculoId,
          placa: veiculo.placa || venda.placa,
          clienteNome: venda.compradorNome,
          formaPagamento: pag.forma,
          criadoPor: usuarioNome,
          createdAt: nowIso,
          afetaSaldoAtual: true,
          naturezaTemporal: 'operacao_atual',
          statusConciliacao: 'movimentacao_bancaria_confirmada',
        };

        transaction.set(docMovRef, novaMovimentacao);
      });
    }
  } catch (error) {
    console.error('Erro ao processar integração financeira atômica da venda:', error);
    throw error;
  }
}

/**
 * =========================================================================
 * 5. INTEGRAÇÃO AUTOMÁTICA FINANCEIRA: DESPESA PAGA -> SALDO BANCÁRIO & EXTRATO
 * =========================================================================
 * Ao salvar uma despesa como "Paga", SE uma conta bancária foi selecionada,
 * desconta o valor do saldo principal dessa conta e gera um extrato com:
 * Tipo: Saída (Despesa)
 * Histórico: "Pagamento de Despesa: [Categoria] - Fornecedor: [Nome] - Veículo: [Placa]"
 * Se nenhuma conta for selecionada, apenas salva no histórico do carro.
 */
export async function processarPagamentoDespesaFinanceiro(
  despesa: DespesaVeiculo,
  veiculo: Veiculo,
  usuarioNome: string = 'Sistema'
): Promise<void> {
  // Se não tem status "Pago" ou não tem conta bancária vinculada, não gera movimentação bancária
  if (despesa.statusPagamento !== 'Pago' || !despesa.contaBancariaId) {
    return;
  }

  // Se for classificado como histórico importado (anterior à conferência), não afeta saldo bancário atual
  if (despesa.naturezaTemporal === 'historico_importado' || despesa.jaEstavaNoSaldoConferido) {
    return;
  }

  const valorDespesa = Number(despesa.valor || 0);
  if (valorDespesa <= 0) return;

  const despId = despesa.id || `desp_${Date.now()}`;
  const movId = despesa.movimentacaoFinanceiraId || `mov_desp_${despId}`;
  const idempotencyKey = `idemp_desp_${despId}`;

  const docContaRef = doc(db, COLLECTIONS.CONTAS_BANCARIAS, despesa.contaBancariaId);
  const docMovRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, movId);

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Validar idempotência determinística dentro da transação
      const movSnap = await transaction.get(docMovRef);
      if (movSnap.exists()) {
        console.log(`[Idempotência] Pagamento da despesa ${despId} já processado anteriormente.`);
        return;
      }

      // 2. Leitura da conta bancária
      const contaSnap = await transaction.get(docContaRef);
      if (!contaSnap.exists()) {
        throw new Error(`Conta bancária ${despesa.contaBancariaId} não encontrada no Firestore para débito de despesa.`);
      }

      const dataConta = contaSnap.data();
      const saldoAnterior = Number(dataConta.saldoAtualOperacional ?? dataConta.saldo ?? 0);
      const novoSaldo = saldoAnterior - valorDespesa;
      const nowIso = new Date().toISOString();

      // 3. Atualizar saldo operacional preservando saldoConferido intacto
      transaction.update(docContaRef, {
        saldoAtualOperacional: novoSaldo,
        saldo: novoSaldo,
        saldoAtual: novoSaldo,
        updatedAt: nowIso,
      });

      // 4. Gravar registro no extrato bancário
      const placaStr = veiculo.placa || despesa.placa || 'Sem Placa';
      const fornecedorStr = despesa.fornecedor || 'Fornecedor Parceiro';
      const categoriaStr = despesa.categoria || 'Despesa';
      const dataPagamentoStr = despesa.dataPagamento || despesa.data || nowIso.split('T')[0];
      const historicoTexto = `Pagamento de Despesa: ${categoriaStr} - Fornecedor: ${fornecedorStr} - Veículo: ${placaStr}`;

      const novaMovimentacao: MovimentacaoConta = {
        id: movId,
        idempotencyKey,
        contaId: despesa.contaBancariaId!,
        contaNome: dataConta.nome || 'Conta',
        tipo: 'Despesa',
        categoria: categoriaStr,
        valor: valorDespesa,
        data: dataPagamentoStr,
        descricao: historicoTexto,
        veiculoId: veiculo.id || despesa.veiculoId,
        placa: placaStr,
        formaPagamento: despesa.formaPagamento || 'PIX',
        criadoPor: usuarioNome,
        createdAt: nowIso,
        afetaSaldoAtual: true,
        naturezaTemporal: 'operacao_atual',
        statusConciliacao: 'movimentacao_bancaria_confirmada',
      };

      transaction.set(docMovRef, novaMovimentacao);
      console.log(`Débito financeiro efetuado com sucesso: -R$ ${valorDespesa} em ${dataConta.nome} (${historicoTexto})`);
    });
  } catch (error) {
    console.error('Erro ao processar débito financeiro da despesa:', error);
    throw error;
  }
}

/**
 * =========================================================================
 * 6. LIQUIDAÇÃO DE CONTAS A RECEBER: FINANCIAMENTOS & TACs DE BANCOS PARCEIROS
 * =========================================================================
 * Realiza a baixa de títulos a receber de financiamento e TAC:
 * - Atualiza o status do título na Venda para "Recebido"
 * - Credita o valor selecionado no saldo da conta bancária de destino
 * - Gera lançamento no Extrato com Tipo "Receita / Entrada" e histórico descritivo
 */
export async function processarLiquidacaoRecebivelFirestore(params: {
  venda: VendaVeiculo;
  tipoTitulo: 'financiamento' | 'tac' | 'parcela_hibrida';
  parcelaIndex?: number;
  dataLiquidacao: string;
  contaBancariaId: string;
  valorLiquidado: number;
  formaLiquidacao?: string;
  observacoes?: string;
  usuarioNome?: string;
  // Parâmetros auditáveis para liquidação de TAC
  tacBruto?: number;
  descontoIla?: number;
  tacLiquido?: number;
  usuarioConfirmouId?: string;
  usuarioConfirmouNome?: string;
}): Promise<{ vendaAtualizada: VendaVeiculo; contaAtualizada: ContaBancariaCaixa; movimentacao: MovimentacaoConta }> {
  const {
    venda,
    tipoTitulo,
    dataLiquidacao,
    contaBancariaId,
    valorLiquidado,
    formaLiquidacao = 'TED/PIX Financeira',
    observacoes = '',
    usuarioNome = 'Sistema Financeiro',
    tacBruto,
    descontoIla,
    tacLiquido,
    usuarioConfirmouId: userConfIdParam,
    usuarioConfirmouNome: userConfNomeParam,
  } = params;

  if (!contaBancariaId) {
    throw new Error('Conta bancária de destino é obrigatória para liquidação de recebível.');
  }

  const movId = `mov_rec_${venda.id}_${tipoTitulo}`;
  const idempotencyKey = `idemp_rec_${venda.id}_${tipoTitulo}`;
  const nowIso = new Date().toISOString();

  const docContaRef = doc(db, COLLECTIONS.CONTAS_BANCARIAS, contaBancariaId);
  const docVendaRef = doc(db, COLLECTIONS.VENDAS, venda.id);
  const docMovRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, movId);

  return await runTransaction(db, async (transaction) => {
    // 1. Validar idempotência determinística
    const movSnap = await transaction.get(docMovRef);
    if (movSnap.exists()) {
      throw new Error(`Este recebível (${tipoTitulo}) já foi liquidado anteriormente.`);
    }

    // 2. Leitura da Conta Bancária
    const contaSnap = await transaction.get(docContaRef);
    if (!contaSnap.exists()) {
      throw new Error(`Conta bancária ${contaBancariaId} não encontrada no Firestore.`);
    }

    // 3. Leitura da Venda
    const vendaSnap = await transaction.get(docVendaRef);
    const vendaAtual = (vendaSnap.exists() ? vendaSnap.data() : venda) as VendaVeiculo;

    // Cálculo dos valores efetivos para TAC e Crédito
    const tacBrutoEfetivo = tacBruto !== undefined
      ? Number(tacBruto)
      : Number(vendaAtual.financiamentoDetalhes?.retornoComissaoBanco ?? valorLiquidado);
    const descontoIlaEfetivo = descontoIla !== undefined
      ? Number(descontoIla)
      : 0;
    const tacLiquidoEfetivo = tacLiquido !== undefined
      ? Number(tacLiquido)
      : (tacBrutoEfetivo - descontoIlaEfetivo > 0 ? Number((tacBrutoEfetivo - descontoIlaEfetivo).toFixed(2)) : Number(valorLiquidado));

    const usuarioConfirmouId = userConfIdParam || usuarioNome;
    const usuarioConfirmouNome = userConfNomeParam || usuarioNome;

    const valorCreditoEfetivo = tipoTitulo === 'tac' ? tacLiquidoEfetivo : Number(valorLiquidado || 0);

    const dataConta = contaSnap.data();
    const saldoAnterior = Number(dataConta.saldoAtualOperacional ?? dataConta.saldo ?? 0);
    const novoSaldo = saldoAnterior + valorCreditoEfetivo;

    // 4. Atualizar saldo da Conta Bancária preservando saldoConferido
    transaction.update(docContaRef, {
      saldoAtualOperacional: novoSaldo,
      saldo: novoSaldo,
      saldoAtual: novoSaldo,
      updatedAt: nowIso,
    });

    const contaAtualizada = normalizeContaBancaria({
      ...dataConta,
      saldoAtualOperacional: novoSaldo,
      saldo: novoSaldo,
      saldoAtual: novoSaldo,
    }, contaBancariaId);

    // 5. Histórico e Descrição do Extrato
    const bancoNome =
      vendaAtual.financiamentoDetalhes?.bancoParceiroNome ||
      vendaAtual.financiamentoDetalhes?.bancoParceiro ||
      'Banco Financiador';
    const placaVeiculo = vendaAtual.placa || 'Sem Placa';
    const compradorNome = vendaAtual.compradorNome || 'Cliente Comprador';

    let descricaoExtrato = '';
    let categoriaExtrato = '';

    if (tipoTitulo === 'financiamento') {
      categoriaExtrato = 'Liquidação de Financiamento';
      descricaoExtrato = `Liquidação de Financiamento: ${bancoNome} - Veículo: ${placaVeiculo} - Cliente: ${compradorNome}`;
    } else if (tipoTitulo === 'tac') {
      categoriaExtrato = 'Recebimento TAC / Retorno';
      descricaoExtrato = `Recebimento de Retorno/TAC: ${bancoNome} (Bruto: R$ ${tacBrutoEfetivo.toFixed(2)}, ILA: R$ ${descontoIlaEfetivo.toFixed(2)}, Líq: R$ ${tacLiquidoEfetivo.toFixed(2)}) - Veículo: ${placaVeiculo} - Cliente: ${compradorNome}`;
    } else {
      categoriaExtrato = 'Recebimento de Venda';
      descricaoExtrato = `Liquidação de Recebível: ${formaLiquidacao} - Veículo: ${placaVeiculo} - Cliente: ${compradorNome}`;
    }

    if (observacoes.trim()) {
      descricaoExtrato += ` (${observacoes.trim()})`;
    }

    // 6. Atualizar FinanciamentoDetalhes na Venda
    const updatedFinanciamento = {
      ...(vendaAtual.financiamentoDetalhes || {
        bancoParceiro: 'BV',
        valorEntrada: 0,
        valorFinanciado: 0,
        retornoComissaoBanco: 0,
      }),
    };

    if (tipoTitulo === 'financiamento') {
      updatedFinanciamento.statusLiquidacaoFinanciamento = 'Recebido';
      updatedFinanciamento.dataLiquidacaoFinanciamento = dataLiquidacao;
      updatedFinanciamento.contaBancariaLiquidacaoId = contaAtualizada.id;
      updatedFinanciamento.contaBancariaLiquidacaoNome = contaAtualizada.nome;
      updatedFinanciamento.formaLiquidacaoFinanciamento = formaLiquidacao;
    } else if (tipoTitulo === 'tac') {
      updatedFinanciamento.statusLiquidacaoTac = 'Recebido';
      updatedFinanciamento.dataLiquidacaoTac = dataLiquidacao;
      updatedFinanciamento.contaBancariaTacId = contaAtualizada.id;
      updatedFinanciamento.contaBancariaTacNome = contaAtualizada.nome;
      updatedFinanciamento.formaLiquidacaoTac = formaLiquidacao;
      updatedFinanciamento.retornoComissaoBanco = tacBrutoEfetivo;
      vendaAtual.retornoFinanciamentoTac = tacLiquidoEfetivo;

      // Gestão precisa de comissões com auditoria de TAC
      let comissoes = Array.isArray(vendaAtual.comissoesDetalhadas)
        ? [...vendaAtual.comissoesDetalhadas]
        : [];

      // 1. Identificar todos os usuários participantes da venda
      // (vendedor, usuários já com comissões na venda, beneficiário de comissão gerencial, etc.)
      const usuarioIdsParticipantes = new Set<string>();
      if (vendaAtual.vendedorId) usuarioIdsParticipantes.add(vendaAtual.vendedorId);
      if (vendaAtual.comissaoGerencialBeneficiarioId) usuarioIdsParticipantes.add(vendaAtual.comissaoGerencialBeneficiarioId);
      if ((vendaAtual as any).operadorFinanciamentoId) usuarioIdsParticipantes.add((vendaAtual as any).operadorFinanciamentoId);
      if ((vendaAtual as any).responsavelFinanciamentoId) usuarioIdsParticipantes.add((vendaAtual as any).responsavelFinanciamentoId);
      comissoes.forEach((c) => {
        if (c.usuarioId) usuarioIdsParticipantes.add(c.usuarioId);
      });

      // Carregar os dados de cada usuário participante dentro da mesma transação
      const usuariosMap = new Map<string, any>();
      for (const uId of usuarioIdsParticipantes) {
        if (!uId) continue;
        const userRef = doc(db, COLLECTIONS.USUARIOS, uId);
        const userSnap = await transaction.get(userRef);
        if (userSnap.exists()) {
          usuariosMap.set(uId, userSnap.data());
        }
      }

      // Conjunto para rastrear chaves já processadas: `${usuarioId}_${regraId}`
      const regrasProcessadas = new Set<string>();

      // 2. Primeiro: recalcular ou finalizar cada comissão existente de tipoBase === 'Retorno TAC' usando o TAC líquido efetivo
      comissoes = comissoes.map((c) => {
        if (c.tipoBase === 'Retorno TAC') {
          const uId = c.usuarioId;
          const rId = c.regraId;
          regrasProcessadas.add(`${uId}_${rId}`);

          const percentOuValor = Number(c.valorOrPercentual || 0);
          const novoValorCalculado = c.formato === 'Percentual'
            ? Number(((tacLiquidoEfetivo * percentOuValor) / 100).toFixed(2))
            : percentOuValor;

          const snapshot: SnapshotConfirmacaoTacComissao = {
            tacBruto: tacBrutoEfetivo,
            descontoIla: descontoIlaEfetivo,
            tacLiquidoEfetivo: tacLiquidoEfetivo,
            percentualOuValorRegra: percentOuValor,
            valorComissaoCalculado: novoValorCalculado,
            dataHoraConfirmacao: nowIso,
            usuarioConfirmouId,
            usuarioConfirmouNome,
            regraIdOriginal: rId || '',
          };

          return {
            ...c,
            id: `${vendaAtual.id}_${uId}_${rId}`,
            baseCalculo: tacLiquidoEfetivo,
            valorCalculado: c.isento ? 0 : novoValorCalculado,
            aguardaLiquidacaoTac: false,
            statusLiberacao: 'Liberada_Para_Pagamento' as const,
            snapshotConfirmacaoTac: snapshot,
          };
        }

        // Liberar somente comissão dependente de TAC se a regra exigir isso, sem alterar indevidamente comissões que não dependem de TAC
        if (c.aguardaLiquidacaoTac) {
          return {
            ...c,
            aguardaLiquidacaoTac: false,
            statusLiberacao: 'Liberada_Para_Pagamento' as const,
          };
        }

        return c;
      });

      // 3. Aplicar as regras dinâmicas com tipoBase === 'Retorno TAC' de cada participante da venda
      // Preservando o motor dinâmico e sem assumir que o vendedor é o beneficiário, nem usar regraComissaoPadrao/comissaoBonusTacPercent
      for (const [uId, uData] of usuariosMap.entries()) {
        const regrasRemuneracao = (uData?.regrasRemuneracao && Array.isArray(uData.regrasRemuneracao))
          ? (uData.regrasRemuneracao as RegraRemuneracao[])
          : [];

        const regrasTacUsuario = regrasRemuneracao.filter((r) => r.tipoBase === 'Retorno TAC');

        for (const r of regrasTacUsuario) {
          const itemKey = `${uId}_${r.id}`;
          const itemId = `${vendaAtual.id}_${uId}_${r.id}`;

          const percentOuValor = Number(r.valorOrPercentual || 0);
          const novoValorCalculado =
            r.formato === 'Percentual'
              ? Number(((tacLiquidoEfetivo * percentOuValor) / 100).toFixed(2))
              : percentOuValor;

          const snapshot: SnapshotConfirmacaoTacComissao = {
            tacBruto: tacBrutoEfetivo,
            descontoIla: descontoIlaEfetivo,
            tacLiquidoEfetivo: tacLiquidoEfetivo,
            percentualOuValorRegra: percentOuValor,
            valorComissaoCalculado: novoValorCalculado,
            dataHoraConfirmacao: nowIso,
            usuarioConfirmouId,
            usuarioConfirmouNome,
            regraIdOriginal: r.id,
          };

          if (regrasProcessadas.has(itemKey)) {
            continue;
          }

          // Localizar se já existe item de comissão com esse usuário e regra
          const indexExistente = comissoes.findIndex(
            (c) => (c.usuarioId === uId && c.regraId === r.id) || c.id === itemId
          );

          if (indexExistente !== -1) {
            comissoes[indexExistente] = {
              ...comissoes[indexExistente],
              id: itemId,
              baseCalculo: tacLiquidoEfetivo,
              valorCalculado: comissoes[indexExistente].isento ? 0 : novoValorCalculado,
              aguardaLiquidacaoTac: false,
              statusLiberacao: 'Liberada_Para_Pagamento',
              snapshotConfirmacaoTac: snapshot,
            };
          } else {
            const papelBeneficiario =
              uData?.role === 'admin'
                ? 'Gerente'
                : uId === vendaAtual.vendedorId
                ? 'Vendedor'
                : 'Responsavel_Financiamento';

            const novoItemTac: ComissaoDetalhadaVenda = {
              id: itemId,
              vendaId: vendaAtual.id,
              veiculoId: vendaAtual.veiculoId,
              placa: vendaAtual.placa,
              usuarioId: uId,
              usuarioNome: uData?.nomeCompleto || uData?.displayName || uData?.email || 'Usuário',
              usuarioEmail: uData?.email,
              usuarioCargo: uData?.cargo,
              usuarioRole: uData?.role,
              beneficiarioPapel: papelBeneficiario,
              regraId: r.id,
              tipoBase: 'Retorno TAC',
              formato: r.formato || 'Percentual',
              valorOrPercentual: percentOuValor,
              condicaoGatilho: r.condicaoGatilho || 'Apenas se houver TAC',
              baseCalculo: tacLiquidoEfetivo,
              valorCalculado: novoValorCalculado,
              aguardaLiquidacaoTac: false,
              statusLiberacao: 'Liberada_Para_Pagamento',
              statusPagamento: 'Pendente',
              status: 'Pendente',
              snapshotConfirmacaoTac: snapshot,
            };

            comissoes.push(novoItemTac);
          }
          regrasProcessadas.add(itemKey);
        }
      }

      vendaAtual.comissoesDetalhadas = comissoes;
      const tacItems = comissoes.filter((c) => c.tipoBase === 'Retorno TAC');
      if (tacItems.length > 0) {
        const totalTacComissao = tacItems.reduce((sum, c) => sum + (Number(c.valorCalculado) || 0), 0);
        vendaAtual.comissaoBonusTacValor = totalTacComissao;
        const primeiroTac = tacItems[0];
        vendaAtual.comissaoBonusTacPercent = Number(primeiroTac.valorOrPercentual || 0);
      }
      const totalComissoes = comissoes.reduce((sum, c) => sum + (Number(c.valorCalculado) || 0), 0);
      if (totalComissoes > 0) {
        vendaAtual.comissaoValor = totalComissoes;
      }
    }

    if (observacoes.trim()) {
      updatedFinanciamento.observacoesLiquidacao =
        (updatedFinanciamento.observacoesLiquidacao ? updatedFinanciamento.observacoesLiquidacao + ' | ' : '') +
        observacoes.trim();
    }

    const vendaAtualizada: VendaVeiculo = {
      ...vendaAtual,
      financiamentoDetalhes: updatedFinanciamento,
    };

    transaction.set(docVendaRef, vendaAtualizada, { merge: true });

    // 7. Criar registro no Extrato Bancário
    const novaMovimentacao: MovimentacaoConta = {
      id: movId,
      idempotencyKey,
      contaId: contaAtualizada.id,
      contaNome: contaAtualizada.nome,
      tipo: 'Receita',
      categoria: categoriaExtrato,
      valor: valorCreditoEfetivo,
      data: dataLiquidacao || nowIso.split('T')[0],
      descricao: descricaoExtrato,
      vinculoVendaId: venda.id,
      veiculoId: venda.veiculoId,
      placa: placaVeiculo,
      clienteNome: compradorNome,
      formaPagamento: formaLiquidacao,
      criadoPor: usuarioNome,
      createdAt: nowIso,
      afetaSaldoAtual: true,
      naturezaTemporal: 'operacao_atual',
      statusConciliacao: 'movimentacao_bancaria_confirmada',
    };

    transaction.set(docMovRef, novaMovimentacao);

    return {
      vendaAtualizada,
      contaAtualizada,
      movimentacao: novaMovimentacao,
    };
  });
}

/**
 * =========================================================================
 * 6. MÓDULO: LANÇAMENTO EXPRESSO & CONCILIAÇÃO BANCÁRIA
 * =========================================================================
 * Criação ultra-rápida de transações financeiras com roteamento contábil
 * (Despesa Fixa, Veículo de Venda, Veículo de Locação, Retirada de Sócio)
 * e auto-criação (pré-cadastro) de Fornecedores e Veículos de Locação.
 */
export interface ParametrosLancamentoExpresso {
  lancamentoExpressoId?: string;
  tipo: 'Entrada' | 'Saída' | 'Receita' | 'Despesa';
  valor: number;
  data: string; // YYYY-MM-DD
  contaId: string;
  contaNome: string;
  pagadorRecebedor: string;
  salvarNovoFornecedor?: boolean;
  categoriaFornecedor?: CategoriaFornecedor;
  destinoRoteamento: 'despesa_fixa' | 'veiculo_estoque' | 'veiculo_locacao' | 'retirada_socio' | 'avulso' | 'venda_realizada' | 'receita_loja';
  categoria?: string;
  categoriaDespesaFixa?: string;
  despesaFixaExistenteId?: string;
  veiculoEstoqueId?: string;
  categoriaDespesaVeiculo?: CategoriaDespesa;
  veiculoLocacaoPlaca?: string;
  veiculoLocacaoModelo?: string;
  salvarNovoVeiculoLocacao?: boolean;
  vinculoVendaId?: string;
  vinculoVendaTipo?: string;
  clienteNome?: string;
  tipoCusto?: 'Fixo' | 'Variável' | 'Neutro';
  descricao: string;
  formaPagamento?: string;
  comprovanteNumero?: string;
  temNotaFiscal?: boolean;
  nfNumero?: string;
  nfSerie?: string;
  nfChaveAcesso?: string;
  nfDataEmissao?: string;
  nfEmitente?: string;
  nfCnpjEmitente?: string;
  nfObservacao?: string;
  observacoes?: string;
  usuarioNome?: string;
  // Extensões para Frota, Pátio, Múltiplos Veículos e Pré-cadastro de Pagadores
  modoRateioMultiplos?: boolean;
  veiculosMultiplos?: { id: string; placa: string; modelo?: string; valorRateado?: number }[];
  categoriasMultiplas?: string[];
  fornecedoresMultiplos?: string[];
  salvarNovoPagadorSemContrato?: boolean;
  dadosNovoPagador?: { cpf?: string; telefone?: string; app?: string; observacoes?: string };
  contratoLocacaoId?: string;
  vincularAoPainelLocacao?: boolean;
  periodicidadeRecebimento?: 'Semanal' | 'Quinzenal' | 'Mensal' | 'Diária' | 'Avulso';
}

export async function salvarLancamentoExpressoFirestore(
  params: ParametrosLancamentoExpresso
): Promise<{
  movimentacao: MovimentacaoConta;
  contaAtualizada: ContaBancariaCaixa;
  novoFornecedorCriado?: FornecedorPrestador;
  novoVeiculoLocacaoCriado?: Veiculo;
  despesaFixaCriada?: DespesaFixa;
  novoPagadorCriado?: PagadorPreCadastro;
  veiculosAtualizados?: Veiculo[];
  veiculoLocacaoAtualizado?: Veiculo;
}> {
  const {
    tipo,
    valor,
    data,
    contaId,
    contaNome,
    pagadorRecebedor,
    salvarNovoFornecedor,
    categoriaFornecedor,
    destinoRoteamento,
    categoria,
    categoriaDespesaFixa,
    despesaFixaExistenteId,
    veiculoEstoqueId,
    categoriaDespesaVeiculo,
    veiculoLocacaoPlaca,
    veiculoLocacaoModelo,
    salvarNovoVeiculoLocacao,
    vinculoVendaId,
    vinculoVendaTipo,
    clienteNome,
    tipoCusto,
    descricao,
    formaPagamento = 'PIX / Transf.',
    comprovanteNumero,
    temNotaFiscal,
    nfNumero,
    nfSerie,
    nfChaveAcesso,
    nfDataEmissao,
    nfEmitente,
    nfCnpjEmitente,
    nfObservacao,
    observacoes,
    usuarioNome = 'Sistema',
    modoRateioMultiplos,
    veiculosMultiplos,
    categoriasMultiplas,
    fornecedoresMultiplos,
    salvarNovoPagadorSemContrato,
    dadosNovoPagador,
    contratoLocacaoId,
    vincularAoPainelLocacao = true,
    periodicidadeRecebimento = 'Semanal',
  } = params;

  if (!contaId) {
    throw new Error('Selecione uma conta bancária ou caixa de destino.');
  }
  if (!valor || valor <= 0) {
    throw new Error('Informe um valor monetário maior que zero.');
  }

  const isSaida = (tipo as string) === 'Saída' || (tipo as string) === 'Saida' || tipo === 'Despesa';
  const dataLancamento = data || new Date().toISOString().split('T')[0];
  const descricaoFinal = (descricao || '').trim() || (isSaida ? `Despesa - ${pagadorRecebedor || 'Avulso'}` : `Receita - ${pagadorRecebedor || 'Avulso'}`);
  const hasNF = Boolean(temNotaFiscal || (nfNumero && nfNumero.trim()));

  // 1. Pré-cadastro de novo Fornecedor/Parceiro caso selecionado
  let novoFornecedorCriado: FornecedorPrestador | undefined;
  if (salvarNovoFornecedor && pagadorRecebedor && pagadorRecebedor.trim()) {
    try {
      const fornecedorId = `forn_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      novoFornecedorCriado = {
        id: fornecedorId,
        nome: pagadorRecebedor.trim(),
        categoria: categoriaFornecedor || 'Outro Parceiro',
        telefone: '',
        status: 'Ativo',
        tipoCobranca: 'Avulso / No Ato do Serviço',
        observacoes: `Criado automaticamente via Lançamento Expresso por ${usuarioNome}`,
        createdAt: new Date().toISOString(),
      };
      await saveFornecedorFirestore(novoFornecedorCriado);
    } catch (err) {
      console.warn('Erro ao salvar pré-cadastro de fornecedor:', err);
    }
  }

  // 1.1 Pré-cadastro de novo Pagador / Motorista sem contrato ativo
  let novoPagadorCriado: PagadorPreCadastro | undefined;
  if (salvarNovoPagadorSemContrato && pagadorRecebedor && pagadorRecebedor.trim()) {
    try {
      const pagId = `pag_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      novoPagadorCriado = {
        id: pagId,
        nome: pagadorRecebedor.trim(),
        cpf: dadosNovoPagador?.cpf?.trim() || undefined,
        telefone: dadosNovoPagador?.telefone?.trim() || undefined,
        tipo: 'Motorista de App',
        app: (dadosNovoPagador?.app as any) || 'Uber',
        status: 'Sem Contrato',
        observacoes: dadosNovoPagador?.observacoes?.trim() || `Pré-cadastro realizado via Lançamento Expresso (${usuarioNome})`,
        createdAt: new Date().toISOString(),
      };
      await savePagadorFirestore(novoPagadorCriado);
    } catch (errPag) {
      console.warn('Erro ao salvar pré-cadastro de pagador:', errPag);
    }
  }

  // 2. Roteamento Contábil
  let despesaFixaIdGerado: string | undefined;
  let despesaVeiculoIdGerado: string | undefined;
  let veiculoIdVinculado: string | undefined;
  let placaVinculada: string | undefined;
  let despesaFixaCriada: DespesaFixa | undefined;
  let novoVeiculoLocacaoCriado: Veiculo | undefined;
  const veiculosAtualizadosRateio: Veiculo[] = [];
  let veiculoLocacaoAtualizado: Veiculo | undefined;

  // A) Rota 1: Despesa/Receita da Loja -> DespesaFixa
  if (destinoRoteamento === 'despesa_fixa') {
    if (despesaFixaExistenteId) {
      despesaFixaIdGerado = despesaFixaExistenteId;
      try {
        const dfSnap = await getDoc(doc(db, COLLECTIONS.DESPESAS_FIXAS, despesaFixaExistenteId));
        if (dfSnap.exists()) {
          const dfData = dfSnap.data() as DespesaFixa;
          await saveDespesaFixaFirestore({
            ...dfData,
            status: 'Pago',
            dataPagamento: dataLancamento,
            contaBancariaId: contaId,
            contaBancariaNome: contaNome,
            formaPagamento: formaPagamento,
          });
        }
      } catch (err) {
        console.warn('Erro ao atualizar despesa fixa existente:', err);
      }
    } else {
      const idDf = `df_exp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      despesaFixaCriada = {
        id: idDf,
        nome: descricaoFinal,
        descricao: descricaoFinal,
        categoria: (categoriaDespesaFixa as any) || 'Outros',
        valor: valor,
        mesReferencia: dataLancamento.substring(0, 7),
        dataVencimento: dataLancamento,
        dataPagamento: isSaida ? dataLancamento : undefined,
        status: isSaida ? 'Pago' : 'Pago',
        contaBancariaId: contaId,
        contaBancariaNome: contaNome,
        fornecedorNome: pagadorRecebedor?.trim() || undefined,
        formaPagamento: formaPagamento,
        temNotaFiscal: hasNF,
        nfNumero: nfNumero?.trim() || undefined,
        nfSerie: nfSerie?.trim() || undefined,
        nfChaveAcesso: nfChaveAcesso?.trim() || undefined,
        nfDataEmissao: nfDataEmissao || undefined,
        nfEmitente: nfEmitente?.trim() || pagadorRecebedor?.trim() || undefined,
        nfCnpjEmitente: nfCnpjEmitente?.trim() || undefined,
        nfObservacao: nfObservacao?.trim() || undefined,
        observacoes: observacoes?.trim() || `Lançamento Expresso (${usuarioNome})`,
      };
      await saveDespesaFixaFirestore(despesaFixaCriada);
      despesaFixaIdGerado = idDf;
    }
  }

  // B) Rota 2: Retirada de Sócio (Saída) ou Aporte de Sócio (Entrada)
  else if (destinoRoteamento === 'retirada_socio') {
    if (isSaida) {
      const idDf = `df_socio_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      despesaFixaCriada = {
        id: idDf,
        nome: `Retirada / Pró-labore: ${pagadorRecebedor?.trim() || 'Sócio'}`,
        descricao: descricaoFinal,
        categoria: 'Pró-labore',
        valor: valor,
        mesReferencia: dataLancamento.substring(0, 7),
        dataVencimento: dataLancamento,
        dataPagamento: dataLancamento,
        status: 'Pago',
        contaBancariaId: contaId,
        contaBancariaNome: contaNome,
        beneficiarioNome: pagadorRecebedor?.trim() || 'Sócio / Titular',
        fornecedorNome: pagadorRecebedor?.trim() || 'Sócio / Titular',
        formaPagamento: formaPagamento,
        observacoes: observacoes?.trim() || `Retirada de pró-labore registrada via Lançamento Expresso (${usuarioNome})`,
      };
      await saveDespesaFixaFirestore(despesaFixaCriada);
      despesaFixaIdGerado = idDf;
    }
  }

  // C) Rota 3: Despesa com Múltiplos Veículos / Rateio de Pátio e Frota
  else if (isSaida && modoRateioMultiplos && veiculosMultiplos && veiculosMultiplos.length > 0) {
    const totalCarros = veiculosMultiplos.length;
    for (let i = 0; i < totalCarros; i++) {
      const item = veiculosMultiplos[i];
      const valorItem = item.valorRateado && item.valorRateado > 0 ? item.valorRateado : (valor / totalCarros);
      try {
        const vSnap = await getDoc(doc(db, COLLECTIONS.VEICULOS, item.id));
        if (vSnap.exists()) {
          const vData = vSnap.data() as Veiculo;
          const despId = `desp_rateio_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`;
          const fornecedorStr = (fornecedoresMultiplos && fornecedoresMultiplos.length > 0)
            ? fornecedoresMultiplos.join(', ')
            : (pagadorRecebedor?.trim() || 'Fornecedor Avulso');
          const categoriasStr = (categoriasMultiplas && categoriasMultiplas.length > 0)
            ? categoriasMultiplas.join(' + ')
            : (categoriaDespesaVeiculo || categoria || 'Manutenção Pátio/Frota');

          const novaDesp: DespesaVeiculo = {
            id: despId,
            veiculoId: vData.id,
            chassi: vData.chassi || '',
            placa: vData.placa,
            categoria: (categoriasMultiplas?.[0] as CategoriaDespesa) || categoriaDespesaVeiculo || 'Peças',
            descricao: `${descricaoFinal} [Rateio ${i + 1}/${totalCarros} - ${item.placa}]`,
            valor: valorItem,
            data: dataLancamento,
            dataPagamento: dataLancamento,
            fornecedor: fornecedorStr,
            statusPagamento: 'Pago',
            contaBancariaId: contaId,
            contaBancariaNome: contaNome,
            formaPagamento: formaPagamento,
            temNotaFiscal: hasNF,
            nfNumero: nfNumero?.trim() || undefined,
            nfSerie: nfSerie?.trim() || undefined,
            nfChaveAcesso: nfChaveAcesso?.trim() || undefined,
            nfDataEmissao: nfDataEmissao || undefined,
            nfEmitente: nfEmitente?.trim() || fornecedorStr || undefined,
            nfCnpjEmitente: nfCnpjEmitente?.trim() || undefined,
            nfObservacao: nfObservacao?.trim() || undefined,
            observacoes: `Rateio pátio/frota (${usuarioNome}). Categorias: ${categoriasStr}. Veículos: ${veiculosMultiplos.map((v) => v.placa).join(', ')}`,
          };

          const veicUpdated: Veiculo = {
            ...vData,
            despesas: [novaDesp, ...(vData.despesas || [])],
          };
          await saveVeiculoFirestore(veicUpdated);
          veiculosAtualizadosRateio.push(veicUpdated);
        }
      } catch (errRateio) {
        console.error(`Erro ao salvar despesa rateada no veículo ${item.placa}:`, errRateio);
      }
    }
  }

  // D) Rota 4: Veículo de Venda (Estoque) Individual
  else if (destinoRoteamento === 'veiculo_estoque' && veiculoEstoqueId) {
    try {
      const veicSnap = await getDoc(doc(db, COLLECTIONS.VEICULOS, veiculoEstoqueId));
      if (veicSnap.exists()) {
        const veicData = veicSnap.data() as Veiculo;
        veiculoIdVinculado = veicData.id;
        placaVinculada = veicData.placa;

        if (isSaida) {
          const despId = `desp_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          const fornecedorStr = (fornecedoresMultiplos && fornecedoresMultiplos.length > 0)
            ? fornecedoresMultiplos.join(', ')
            : (pagadorRecebedor?.trim() || 'Fornecedor Avulso');

          const novaDespesaVeiculo: DespesaVeiculo = {
            id: despId,
            veiculoId: veicData.id,
            chassi: veicData.chassi || '',
            placa: veicData.placa || '',
            categoria: (categoriasMultiplas?.[0] as CategoriaDespesa) || categoriaDespesaVeiculo || 'Peças',
            descricao: descricaoFinal,
            valor: valor,
            data: dataLancamento,
            dataPagamento: dataLancamento,
            fornecedor: fornecedorStr,
            statusPagamento: 'Pago',
            contaBancariaId: contaId,
            contaBancariaNome: contaNome,
            formaPagamento: formaPagamento,
            temNotaFiscal: hasNF,
            nfNumero: nfNumero?.trim() || undefined,
            nfSerie: nfSerie?.trim() || undefined,
            nfChaveAcesso: nfChaveAcesso?.trim() || undefined,
            nfDataEmissao: nfDataEmissao || undefined,
            nfEmitente: nfEmitente?.trim() || fornecedorStr || undefined,
            nfCnpjEmitente: nfCnpjEmitente?.trim() || undefined,
            nfObservacao: nfObservacao?.trim() || undefined,
            observacoes: observacoes?.trim() || `Lançamento Expresso (${usuarioNome})`,
          };

          const despesasAtualizadas = [novaDespesaVeiculo, ...(veicData.despesas || [])];
          const veicAtualizado: Veiculo = {
            ...veicData,
            despesas: despesasAtualizadas,
          };

          await saveVeiculoFirestore(veicAtualizado);
          despesaVeiculoIdGerado = despId;
          veiculosAtualizadosRateio.push(veicAtualizado);
        }
      }
    } catch (err) {
      console.error('Erro ao vincular lançamento ao veículo de estoque:', err);
    }
  }

  // E) Rota 5: Veículo de Locação / Frota (Receitas e Custos)
  else if (destinoRoteamento === 'veiculo_locacao') {
    const placaLimpa = veiculoLocacaoPlaca?.trim().toUpperCase() || '';
    placaVinculada = placaLimpa;

    try {
      // Buscar se já existe veículo com essa placa ou contratoId
      const todosVeicsSnap = await getDocs(collection(db, COLLECTIONS.VEICULOS));
      let veiculoEncontrado: Veiculo | undefined;
      todosVeicsSnap.forEach((d) => {
        const v = d.data() as Veiculo;
        if (contratoLocacaoId && v.contratoAtivo?.id === contratoLocacaoId) {
          veiculoEncontrado = { ...v, id: d.id };
        } else if (!veiculoEncontrado && placaLimpa && v.placa && v.placa.trim().toUpperCase() === placaLimpa) {
          veiculoEncontrado = { ...v, id: d.id };
        }
      });

      if (veiculoEncontrado) {
        veiculoIdVinculado = veiculoEncontrado.id;
        placaVinculada = veiculoEncontrado.placa;

        if (isSaida) {
          // Despesa / Custo de Manutenção da Frota
          const despId = `desp_loc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
          const fornecedorStr = (fornecedoresMultiplos && fornecedoresMultiplos.length > 0)
            ? fornecedoresMultiplos.join(', ')
            : (pagadorRecebedor?.trim() || 'Oficina / Parceiro');

          const novaDespesaVeiculo: DespesaVeiculo = {
            id: despId,
            veiculoId: veiculoEncontrado.id,
            chassi: veiculoEncontrado.chassi || '',
            placa: veiculoEncontrado.placa,
            categoria: (categoriasMultiplas?.[0] as CategoriaDespesa) || categoriaDespesaVeiculo || 'Mecânica / Mão de Obra',
            descricao: descricaoFinal,
            valor: valor,
            data: dataLancamento,
            dataPagamento: dataLancamento,
            fornecedor: fornecedorStr,
            statusPagamento: 'Pago',
            contaBancariaId: contaId,
            contaBancariaNome: contaNome,
            formaPagamento: formaPagamento,
            observacoes: observacoes?.trim() || `Lançamento Expresso Locação (${usuarioNome})`,
          };

          const veicAtualizado: Veiculo = {
            ...veiculoEncontrado,
            despesas: [novaDespesaVeiculo, ...(veiculoEncontrado.despesas || [])],
          };
          await saveVeiculoFirestore(veicAtualizado);
          despesaVeiculoIdGerado = despId;
          veiculoLocacaoAtualizado = veicAtualizado;
        } else {
          // RECEITA DE FROTA: Vinculação Automática ao Painel de Locação
          if (vincularAoPainelLocacao && veiculoEncontrado.contratoAtivo) {
            const contrato = veiculoEncontrado.contratoAtivo;
            const pagId = `pag_loc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
            const periodicidade = periodicidadeRecebimento || (categoria?.toLowerCase().includes('semanal') ? 'Semanal' : 'Semanal');

            // Calcular próximo vencimento caso seja cobrança semanal
            let proximoVenc = contrato.proximoVencimento;
            if (periodicidade === 'Semanal') {
              try {
                const baseDate = new Date((contrato.proximoVencimento || dataLancamento) + 'T12:00:00');
                baseDate.setDate(baseDate.getDate() + 7);
                proximoVenc = baseDate.toISOString().split('T')[0];
              } catch {
                // fallback
              }
            }

            const novoPagamento: PagamentoAluguel = {
              id: pagId,
              contratoId: contrato.id,
              veiculoId: veiculoEncontrado.id,
              motoristaNome: contrato.motoristaNome,
              semanaReferencia: `Recebimento ${periodicidade} (${dataLancamento})`,
              dataVencimento: contrato.proximoVencimento || dataLancamento,
              valor: valor,
              status: 'Pago',
              dataPagamento: dataLancamento,
              metodoPagamento: formaPagamento.includes('PIX')
                ? 'PIX'
                : formaPagamento.includes('Boleto')
                ? 'Boleto'
                : formaPagamento.includes('Dinheiro')
                ? 'Dinheiro'
                : 'Transferência',
              observacao: observacoes?.trim() || `Recebido via Lançamento Expresso (${categoria || 'Aluguel Semanal'})`,
            };

            const novoCreditoCC: LancamentoContaMotorista = {
              id: `cc_cr_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
              data: dataLancamento,
              tipo: 'CREDITO_PAGAMENTO',
              descricao: `${categoria || 'Aluguel Semanal'} - Recebido via Lançamento Expresso`,
              valor: valor,
              saldoApos: (contrato.caucaoSaldoAtual !== undefined ? contrato.caucaoSaldoAtual : contrato.caucao) || 0,
            };

            const updatedContrato: ContratoLocacao = {
              ...contrato,
              proximoVencimento: proximoVenc || contrato.proximoVencimento,
              pagamentos: [novoPagamento, ...(contrato.pagamentos || [])],
              contaCorrenteMotorista: [novoCreditoCC, ...(contrato.contaCorrenteMotorista || [])],
            };

            const veicAtualizado: Veiculo = {
              ...veiculoEncontrado,
              contratoAtivo: updatedContrato,
            };

            await saveVeiculoFirestore(veicAtualizado);
            veiculoLocacaoAtualizado = veicAtualizado;
          }
        }

        // Salvar pré-cadastro de pagador de locação se solicitado
        if (!isSaida && salvarNovoPagadorSemContrato && pagadorRecebedor) {
          const pagadorSalvo: PagadorPreCadastro = {
            id: `pagador_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            nome: pagadorRecebedor.trim(),
            cpf: dadosNovoPagador?.cpf || '',
            telefone: dadosNovoPagador?.telefone || '',
            app: dadosNovoPagador?.app || 'Uber / 99',
            observacoes: dadosNovoPagador?.observacoes || `Pré-cadastro via Lançamento Expresso (${dataLancamento})`,
            dataCadastro: dataLancamento,
            ultimoPagamento: dataLancamento,
            totalPagoAcumulado: valor,
            veiculoPlacaInteresse: placaLimpa || undefined,
            status: 'Ativo',
            criadoPor: usuarioNome,
          };
          await savePagadorPreCadastroFirestore(pagadorSalvo);
          novoPagadorCriado = pagadorSalvo;
        }
      } else if (salvarNovoVeiculoLocacao && placaLimpa) {
        const novoId = `veic_loc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        veiculoIdVinculado = novoId;
        const despId = `desp_loc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
        const novaDespesaVeiculo: DespesaVeiculo | undefined = isSaida ? {
          id: despId,
          veiculoId: novoId,
          chassi: `LOC-${placaLimpa.replace(/[^A-Z0-9]/g, '')}`,
          placa: placaLimpa,
          categoria: (categoriasMultiplas?.[0] as CategoriaDespesa) || categoriaDespesaVeiculo || 'Mecânica / Mão de Obra',
          descricao: descricaoFinal,
          valor: valor,
          data: dataLancamento,
          dataPagamento: dataLancamento,
          fornecedor: pagadorRecebedor?.trim() || 'Oficina / Parceiro',
          statusPagamento: 'Pago',
          contaBancariaId: contaId,
          contaBancariaNome: contaNome,
          formaPagamento: formaPagamento,
          observacoes: `Criado junto ao veículo de locação via Lançamento Expresso`,
        } : undefined;

        novoVeiculoLocacaoCriado = {
          id: novoId,
          placa: placaLimpa,
          chassi: `LOC-${placaLimpa.replace(/[^A-Z0-9]/g, '')}`,
          modelo: veiculoLocacaoModelo?.trim() || `Veículo Locação ${placaLimpa}`,
          marca: 'Diversas',
          ano: new Date().getFullYear(),
          tipoOperacao: 'Locacao',
          tipoPropriedade: 'proprio',
          status: 'Disponível',
          status_estoque: 'No Pátio',
          cor: 'Branco',
          combustivel: 'Flex',
          kmAtual: 0,
          kmUltimaRevisao: 0,
          custoAquisicao: 0,
          dataEntrada: dataLancamento,
          despesas: novaDespesaVeiculo ? [novaDespesaVeiculo] : [],
          observacoes: `Pré-cadastro rápido realizado via Lançamento Expresso por ${usuarioNome}`,
        };

        await saveVeiculoFirestore(novoVeiculoLocacaoCriado);
        if (isSaida) despesaVeiculoIdGerado = despId;
        veiculoIdVinculado = novoId;
      }
    } catch (err) {
      console.error('Erro ao processar lançamento de locação:', err);
    }
  }

  // 3 e 4. Atualizar saldo da Conta Bancária no Firestore e Gravar Movimentação de forma atômica
  const movId = (params.lancamentoExpressoId && params.lancamentoExpressoId.trim())
    ? (params.lancamentoExpressoId.startsWith('mov_') ? params.lancamentoExpressoId : `mov_${params.lancamentoExpressoId}`)
    : `mov_exp_${params.data || new Date().toISOString().split('T')[0]}_${contaId}_${valor}_${(params.pagadorRecebedor || '').replace(/[^a-zA-Z0-9]/g, '')}`;
  const idempotencyKey = `idemp_${movId}`;
  const nowIso = new Date().toISOString();

  // Determinar categoria contábil e de custos
  let catCustoFinal: 'Custo Fixo' | 'Custo Variável' | 'Retirada Sócio' | 'Receita Venda' | 'Receita Locação' | 'Neutro' | undefined;
  let tipoCustoFinal: 'Fixo' | 'Variável' | 'Neutro' | undefined = tipoCusto;

  if (destinoRoteamento === 'venda_realizada') {
    catCustoFinal = 'Receita Venda';
    tipoCustoFinal = 'Neutro';
  } else if (destinoRoteamento === 'despesa_fixa') {
    catCustoFinal = tipoCusto === 'Variável' ? 'Custo Variável' : 'Custo Fixo';
    tipoCustoFinal = tipoCusto || 'Fixo';
  } else if (destinoRoteamento === 'veiculo_estoque') {
    catCustoFinal = isSaida ? 'Custo Variável' : 'Neutro';
    tipoCustoFinal = isSaida ? 'Variável' : 'Neutro';
  } else if (destinoRoteamento === 'veiculo_locacao') {
    catCustoFinal = isSaida ? 'Custo Variável' : 'Receita Locação';
    tipoCustoFinal = isSaida ? 'Variável' : 'Neutro';
  } else if (destinoRoteamento === 'retirada_socio') {
    catCustoFinal = 'Retirada Sócio';
    tipoCustoFinal = 'Neutro';
  }

  const categoriaFinal = (categoria && categoria.trim()) ||
    categoriaDespesaFixa ||
    (destinoRoteamento === 'veiculo_locacao' && !isSaida ? (periodicidadeRecebimento === 'Semanal' ? 'Recebimento Semanal de Locação' : 'Receita de Locação') : undefined) ||
    categoriaDespesaVeiculo ||
    (destinoRoteamento === 'retirada_socio' ? (isSaida ? 'Pró-labore' : 'Aporte de Sócio') :
     destinoRoteamento === 'venda_realizada' ? (vinculoVendaTipo || 'Receita de Venda') :
     destinoRoteamento === 'receita_loja' ? 'Receita da Loja' :
     isSaida ? 'Despesa Operacional' : 'Receita da Loja');

  const docContaRef = doc(db, COLLECTIONS.CONTAS_BANCARIAS, contaId);
  const docMovRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, movId);

  const { contaAtualizada, novaMovimentacao } = await runTransaction(db, async (transaction) => {
    // 1. Verificar idempotência determinística ANTES de alterar saldo
    const movSnap = await transaction.get(docMovRef);
    if (movSnap.exists()) {
      console.log(`[Idempotência] Lançamento expresso ${movId} já foi processado anteriormente.`);
      const contaSnapExisting = await transaction.get(docContaRef);
      return {
        contaAtualizada: normalizeContaBancaria(contaSnapExisting.exists() ? contaSnapExisting.data() : {}, contaId),
        novaMovimentacao: movSnap.data() as MovimentacaoConta,
      };
    }

    const contaSnap = await transaction.get(docContaRef);
    if (!contaSnap.exists()) {
      throw new Error(`Conta bancária ${contaId} não encontrada no Firestore.`);
    }

    const cData = contaSnap.data();
    const saldoAtual = Number(cData.saldoAtualOperacional ?? cData.saldo ?? 0);
    const novoSaldo = isSaida ? saldoAtual - valor : saldoAtual + valor;

    transaction.update(docContaRef, {
      saldoAtualOperacional: novoSaldo,
      saldo: novoSaldo,
      saldoAtual: novoSaldo,
      updatedAt: nowIso,
    });

    const contaAtualizadaNorm = normalizeContaBancaria({
      ...cData,
      saldoAtualOperacional: novoSaldo,
      saldo: novoSaldo,
      saldoAtual: novoSaldo,
    }, contaId);

    const mov: MovimentacaoConta = {
      id: movId,
      idempotencyKey,
      contaId: contaAtualizadaNorm.id,
      contaNome: contaAtualizadaNorm.nome,
      tipo: isSaida ? 'Despesa' : 'Receita',
      categoria: categoriaFinal,
      valor: valor,
      data: dataLancamento,
      descricao: descricaoFinal,
      pagadorRecebedor: pagadorRecebedor?.trim() || undefined,
      destinoRoteamento: destinoRoteamento,
      despesaFixaId: despesaFixaIdGerado,
      despesaVeiculoId: despesaVeiculoIdGerado,
      veiculoId: veiculoIdVinculado || veiculoEstoqueId,
      placa: placaVinculada || veiculoLocacaoPlaca,
      vinculoVendaId: vinculoVendaId,
      clienteNome: clienteNome || (destinoRoteamento === 'venda_realizada' ? pagadorRecebedor : undefined),
      tipoCusto: tipoCustoFinal,
      categoriaCusto: catCustoFinal,
      formaPagamento: formaPagamento,
      comprovanteNumero: comprovanteNumero?.trim() || undefined,
      temNotaFiscal: hasNF,
      nfNumero: nfNumero?.trim() || undefined,
      nfSerie: nfSerie?.trim() || undefined,
      nfChaveAcesso: nfChaveAcesso?.trim() || undefined,
      nfDataEmissao: nfDataEmissao || undefined,
      nfEmitente: nfEmitente?.trim() || pagadorRecebedor?.trim() || undefined,
      nfCnpjEmitente: nfCnpjEmitente?.trim() || undefined,
      nfObservacao: nfObservacao?.trim() || undefined,
      observacoes: observacoes?.trim() || undefined,
      criadoPor: usuarioNome,
      createdAt: nowIso,
      veiculosMultiplosIds: veiculosMultiplos?.map((v) => v.id),
      veiculosMultiplosPlacas: veiculosMultiplos?.map((v) => v.placa),
      categoriasMultiplas: categoriasMultiplas,
      fornecedoresMultiplos: fornecedoresMultiplos,
      contratoLocacaoId: contratoLocacaoId,
      pagadorSemContrato: !!salvarNovoPagadorSemContrato,
      periodicidadeRecebimento: periodicidadeRecebimento,
      afetaSaldoAtual: true,
      naturezaTemporal: 'operacao_atual',
      statusConciliacao: 'movimentacao_bancaria_confirmada',
    };

    transaction.set(docMovRef, mov);

    return {
      contaAtualizada: contaAtualizadaNorm,
      novaMovimentacao: mov,
    };
  });

  return {
    movimentacao: novaMovimentacao,
    contaAtualizada,
    novoFornecedorCriado,
    novoVeiculoLocacaoCriado,
    despesaFixaCriada,
    novoPagadorCriado,
    veiculosAtualizados: veiculosAtualizadosRateio.length > 0 ? veiculosAtualizadosRateio : undefined,
    veiculoLocacaoAtualizado,
  };
}

/**
 * Atualização direta de campos de uma MovimentacaoConta com { merge: true }
 */
export async function atualizarCamposMovimentacaoFirestore(
  movId: string,
  updates: Partial<MovimentacaoConta>
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, movId);
    const clean = JSON.parse(JSON.stringify(updates));
    await setDoc(docRef, clean, { merge: true });
  } catch (error) {
    console.error('Erro ao atualizar campos da movimentação no Firestore:', error);
    throw error;
  }
}

/**
 * =========================================================================
 * 7. REGRA DE CAIXA: EDIÇÃO SEGURA COM SALDO DIFERENCIAL
 * =========================================================================
 * "Quando o usuário editar o valor de uma transação antiga, NÃO sobrescreva
 * o saldo bancário da loja de forma cega. Calcule a diferença:
 * diferenca = novosDados.valor - movimentacaoAntiga.valor.
 * Atualize o saldo da ContaBancariaCaixa subtraindo ou somando APENAS a diferenca."
 */
export interface ParametrosEdicaoMovimentacao {
  valor: number;
  data: string;
  contaId: string;
  contaNome: string;
  tipo: 'Receita' | 'Despesa' | 'Transferência';
  categoria: string;
  descricao: string;
  pagadorRecebedor?: string;
  formaPagamento?: string;
  observacoes?: string;
  comprovanteNumero?: string;
  tipoCusto?: 'Fixo' | 'Variável' | 'Neutro';
  vinculoVendaId?: string;
}

export async function editarMovimentacaoContaFirestore(
  movimentacaoAntiga: MovimentacaoConta,
  novosDados: ParametrosEdicaoMovimentacao,
  usuarioNome: string = 'Sistema'
): Promise<{
  movimentacaoAtualizada: MovimentacaoConta;
  contaAtualizada?: ContaBancariaCaixa;
  diferencaCalculada: number;
}> {
  const valorAntigo = Number(movimentacaoAntiga.valor || 0);
  const novoValor = Number(novosDados.valor || 0);
  const diferenca = novoValor - valorAntigo;

  const antigaContaId = movimentacaoAntiga.contaId;
  const novaContaId = novosDados.contaId;

  let contaAtualizada: ContaBancariaCaixa | undefined;

  // CASO 1: Mesma conta bancária mantida
  if (antigaContaId === novaContaId) {
    const contaSnap = await getDoc(doc(db, COLLECTIONS.CONTAS_BANCARIAS, antigaContaId));
    if (contaSnap.exists()) {
      const contaData = { ...contaSnap.data(), id: contaSnap.id } as ContaBancariaCaixa;
      const saldoAtual = Number(contaData.saldoAtualOperacional ?? contaData.saldo ?? 0);

      let novoSaldo = saldoAtual;

      // Se ambos eram despesa (saída): gastar mais diminui o saldo, gastar menos aumenta o saldo
      if (movimentacaoAntiga.tipo === 'Despesa' && novosDados.tipo === 'Despesa') {
        novoSaldo = saldoAtual - diferenca;
      }
      // Se ambos eram receita (entrada): receber mais aumenta o saldo, receber menos diminui o saldo
      else if (movimentacaoAntiga.tipo === 'Receita' && novosDados.tipo === 'Receita') {
        novoSaldo = saldoAtual + diferenca;
      }
      // Se mudou o tipo (ex: de Despesa para Receita ou vice-versa)
      else {
        const delta = (novosDados.tipo === 'Receita' ? +novoValor : -novoValor) -
          (movimentacaoAntiga.tipo === 'Receita' ? +valorAntigo : -valorAntigo);
        novoSaldo = saldoAtual + delta;
      }

      contaAtualizada = normalizeContaBancaria({
        ...contaData,
        saldoAtualOperacional: novoSaldo,
        saldo: novoSaldo,
        saldoAtual: novoSaldo,
        updatedAt: new Date().toISOString(),
      }, antigaContaId);
      await saveContaBancariaFirestore(contaAtualizada);
    }
  }
  // CASO 2: A conta bancária foi alterada
  else {
    // 1. Estornar impacto da conta antiga
    const snapAntiga = await getDoc(doc(db, COLLECTIONS.CONTAS_BANCARIAS, antigaContaId));
    if (snapAntiga.exists()) {
      const cAntiga = snapAntiga.data();
      const saldoAntigo = Number(cAntiga.saldoAtualOperacional ?? cAntiga.saldo ?? 0);
      // Se era despesa, devolve o valor antigo; se era receita, retira o valor antigo
      const saldoEstornado = movimentacaoAntiga.tipo === 'Despesa'
        ? saldoAntigo + valorAntigo
        : saldoAntigo - valorAntigo;

      await saveContaBancariaFirestore(normalizeContaBancaria({
        ...cAntiga,
        saldoAtualOperacional: saldoEstornado,
        saldo: saldoEstornado,
        saldoAtual: saldoEstornado,
        updatedAt: new Date().toISOString(),
      }, antigaContaId));
    }

    // 2. Aplicar novo impacto na nova conta
    const snapNova = await getDoc(doc(db, COLLECTIONS.CONTAS_BANCARIAS, novaContaId));
    if (snapNova.exists()) {
      const cNova = snapNova.data();
      const saldoNova = Number(cNova.saldoAtualOperacional ?? cNova.saldo ?? 0);
      const saldoFinal = novosDados.tipo === 'Despesa'
        ? saldoNova - novoValor
        : saldoNova + novoValor;

      contaAtualizada = normalizeContaBancaria({
        ...cNova,
        saldoAtualOperacional: saldoFinal,
        saldo: saldoFinal,
        saldoAtual: saldoFinal,
        updatedAt: new Date().toISOString(),
      }, novaContaId);
      await saveContaBancariaFirestore(contaAtualizada);
    }
  }

  // Atualizar vínculo com Despesa Fixa se existir
  if (movimentacaoAntiga.despesaFixaId) {
    try {
      const dfSnap = await getDoc(doc(db, COLLECTIONS.DESPESAS_FIXAS, movimentacaoAntiga.despesaFixaId));
      if (dfSnap.exists()) {
        const dfData = dfSnap.data() as DespesaFixa;
        const dfAtualizada: DespesaFixa = {
          ...dfData,
          valor: novoValor,
          descricao: novosDados.descricao || dfData.descricao,
          categoria: (novosDados.categoria as any) || dfData.categoria,
          dataVencimento: novosDados.data,
          dataPagamento: novosDados.data,
          mesReferencia: novosDados.data.substring(0, 7),
          contaBancariaId: novosDados.contaId,
          contaBancariaNome: novosDados.contaNome,
          fornecedorNome: novosDados.pagadorRecebedor || dfData.fornecedorNome,
        };
        await saveDespesaFixaFirestore(dfAtualizada);
      }
    } catch (err) {
      console.warn('Erro ao atualizar DespesaFixa vinculada:', err);
    }
  }

  // Atualizar vínculo com Despesa de Veículo se existir
  if (movimentacaoAntiga.veiculoId && movimentacaoAntiga.despesaVeiculoId) {
    try {
      const veicSnap = await getDoc(doc(db, COLLECTIONS.VEICULOS, movimentacaoAntiga.veiculoId));
      if (veicSnap.exists()) {
        const veicData = veicSnap.data() as Veiculo;
        const despesas = (veicData.despesas || []).map((d) => {
          if (d.id === movimentacaoAntiga.despesaVeiculoId) {
            return {
              ...d,
              valor: novoValor,
              descricao: novosDados.descricao || d.descricao,
              data: novosDados.data,
              dataPagamento: novosDados.data,
              fornecedor: novosDados.pagadorRecebedor || d.fornecedor,
              contaBancariaId: novosDados.contaId,
              contaBancariaNome: novosDados.contaNome,
            };
          }
          return d;
        });
        await saveVeiculoFirestore({ ...veicData, despesas });
      }
    } catch (err) {
      console.warn('Erro ao atualizar Despesa de Veículo vinculada:', err);
    }
  }

  // Salvar a movimentação atualizada no extrato
  const movimentacaoAtualizada: MovimentacaoConta = {
    ...movimentacaoAntiga,
    contaId: novosDados.contaId,
    contaNome: novosDados.contaNome,
    tipo: novosDados.tipo,
    categoria: novosDados.categoria,
    valor: novoValor,
    data: novosDados.data,
    descricao: novosDados.descricao,
    pagadorRecebedor: novosDados.pagadorRecebedor,
    formaPagamento: novosDados.formaPagamento || movimentacaoAntiga.formaPagamento,
    observacoes: novosDados.observacoes,
    comprovanteNumero: novosDados.comprovanteNumero,
    tipoCusto: novosDados.tipoCusto || movimentacaoAntiga.tipoCusto,
    vinculoVendaId: novosDados.vinculoVendaId !== undefined ? novosDados.vinculoVendaId : movimentacaoAntiga.vinculoVendaId,
  };

  await saveMovimentacaoContaFirestore(movimentacaoAtualizada);

  return {
    movimentacaoAtualizada,
    contaAtualizada,
    diferencaCalculada: diferenca,
  };
}

/**
 * Realiza o estorno de uma movimentação bancária confirmada sem NUNCA deletar o registro original.
 * Preserva a movimentação original no extrato, cria nova movimentação de estorno com sinal contrário,
 * vincula mutuamente os registros e atualiza o saldo bancário operacional na mesma transação atômica.
 */
export async function excluirMovimentacaoComEstornoFirestore(
  movimentacaoId: string,
  params?: {
    motivo?: string;
    usuarioId?: string;
    usuarioNome?: string;
  }
): Promise<{
  saldoRestaurado: number;
  contaId?: string;
  movimentacaoOriginal: MovimentacaoConta;
  movimentacaoEstorno: MovimentacaoConta;
}> {
  const motivo = params?.motivo?.trim() || 'Estorno de movimentação bancária confirmada';
  const usuarioId = params?.usuarioId;
  const usuarioNome = params?.usuarioNome || 'Sistema';
  const nowIso = new Date().toISOString();

  const movDocRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, movimentacaoId);

  return await runTransaction(db, async (transaction) => {
    // 1. Ler a movimentação original
    const movSnap = await transaction.get(movDocRef);
    if (!movSnap.exists()) {
      throw new Error('Movimentação bancária não encontrada.');
    }

    const mov = movSnap.data() as MovimentacaoConta;

    // 2. Validar se já é estorno ou se já possui movimentacaoEstornoId/isEstornado
    if (mov.isEstorno) {
      throw new Error('Não é permitido estornar uma movimentação que já é um estorno.');
    }
    if (mov.movimentacaoEstornoId || mov.isEstornado) {
      throw new Error('Esta movimentação já foi estornada anteriormente.');
    }

    // 3. Gerar estornoId determinístico
    const estornoId = `mov_estorno_${mov.id}`;
    const estornoDocRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, estornoId);

    // 4. Consultar o documento de estorno
    const estornoSnap = await transaction.get(estornoDocRef);

    // 5. Se o estorno já existir, não alterar saldo e retornar resultado idempotente/erro controlado
    if (estornoSnap.exists()) {
      const estornoExistente = estornoSnap.data() as MovimentacaoConta;
      return {
        saldoRestaurado: 0,
        contaId: mov.contaId,
        movimentacaoOriginal: mov,
        movimentacaoEstorno: estornoExistente,
      };
    }

    // 6. Somente depois ler e atualizar a conta (com todas as leituras prévias à escrita)
    const contaId = mov.contaId;
    const valor = Number(mov.valor || 0);
    const isSaida = (mov.tipo as string) === 'Despesa' || (mov.tipo as string) === 'Saída';

    let saldoRestaurado = 0;
    const contaDocRef = contaId ? doc(db, COLLECTIONS.CONTAS_BANCARIAS, contaId) : null;
    const cSnap = contaDocRef ? await transaction.get(contaDocRef) : null;

    // Leitura antecipada de entidades vinculadas antes de iniciar escritas
    const dfRef = mov.despesaFixaId ? doc(db, COLLECTIONS.DESPESAS_FIXAS, mov.despesaFixaId) : null;
    const dfSnap = dfRef ? await transaction.get(dfRef) : null;

    if (contaDocRef && cSnap && cSnap.exists()) {
      const cData = cSnap.data() as ContaBancariaCaixa;
      const saldoAtual = Number(cData.saldoAtualOperacional ?? cData.saldo ?? 0);
      // Se era saída/despesa, estornar soma de volta. Se era entrada/receita, subtrai.
      const novoSaldo = isSaida ? saldoAtual + valor : saldoAtual - valor;
      saldoRestaurado = novoSaldo;

      transaction.update(contaDocRef, {
        saldoAtualOperacional: novoSaldo,
        saldo: novoSaldo,
        saldoAtual: novoSaldo,
        updatedAt: nowIso,
      });
    }

    // 7. Criar a movimentação de estorno
    const movimentacaoEstorno: MovimentacaoConta = {
      id: estornoId,
      idempotencyKey: `idemp_estorno_${mov.id}`,
      contaId: mov.contaId,
      contaNome: mov.contaNome,
      tipo: isSaida ? 'Receita' : 'Despesa', // sinal contrário
      categoria: 'Estorno de Lançamento',
      valor: valor,
      data: nowIso.split('T')[0],
      descricao: `Estorno de lançamento: ${mov.descricao || ''} - Motivo: ${motivo}`,
      criadoPor: usuarioNome,
      createdAt: nowIso,
      updatedAt: nowIso,
      afetaSaldoAtual: true,
      naturezaTemporal: 'operacao_atual',
      statusConciliacao: 'movimentacao_bancaria_confirmada',
      isEstorno: true,
      statusEstorno: 'Estornado',
      movimentacaoOriginalId: mov.id,
      motivoEstorno: motivo,
      dataHoraEstorno: nowIso,
      usuarioEstornoId: usuarioId,
      usuarioEstornoNome: usuarioNome,
      veiculoId: mov.veiculoId,
      placa: mov.placa,
      vinculoVendaId: mov.vinculoVendaId,
      despesaFixaId: mov.despesaFixaId,
      despesaVeiculoId: mov.despesaVeiculoId,
      formaPagamento: mov.formaPagamento,
    };
    transaction.set(estornoDocRef, movimentacaoEstorno);

    // 8. Atualizar o movimento original
    const movimentacaoOriginalAtualizada: MovimentacaoConta = {
      ...mov,
      movimentacaoEstornoId: estornoId,
      motivoEstorno: motivo,
      dataHoraEstorno: nowIso,
      usuarioEstornoId: usuarioId,
      usuarioEstornoNome: usuarioNome,
      isEstornado: true,
      statusEstorno: 'Estornado',
      updatedAt: nowIso,
    };
    transaction.update(movDocRef, {
      movimentacaoEstornoId: estornoId,
      motivoEstorno: motivo,
      dataHoraEstorno: nowIso,
      usuarioEstornoId: usuarioId,
      usuarioEstornoNome: usuarioNome,
      isEstornado: true,
      statusEstorno: 'Estornado',
      updatedAt: nowIso,
    });

    // 9. Atualizar entidades vinculadas
    if (dfRef && dfSnap && dfSnap.exists()) {
      transaction.update(dfRef, {
        status: 'Pendente',
        dataPagamento: null,
        updatedAt: nowIso,
      });
    }

    return {
      saldoRestaurado,
      contaId,
      movimentacaoOriginal: movimentacaoOriginalAtualizada,
      movimentacaoEstorno,
    };
  });
}

/**
 * Serviço transacional atômico único para exclusão ou estorno de despesas de veículos.
 * Na mesma runTransaction:
 * - lê veículo, despesa, conta bancária e movimentação original;
 * - preserva a despesa com status Cancelada/Estornada e registra auditoria;
 * - atualiza saldoAtualOperacional, saldo e saldoAtual da conta;
 * - mantém a movimentação original no extrato;
 * - cria nova movimentação de estorno com sinal contrário;
 * - vincula despesa, movimento original e estorno;
 * - impede segundo estorno do mesmo pagamento.
 */
export async function excluirOuEstornarDespesaVeiculoFirestore(params: {
  veiculoId: string;
  despesaId: string;
  motivo?: string;
  usuarioId?: string;
  usuarioNome?: string;
}): Promise<{
  veiculoAtualizado: Veiculo;
  contaAtualizada?: ContaBancariaCaixa;
  movimentacaoOriginal?: MovimentacaoConta;
  movimentacaoEstorno?: MovimentacaoConta;
  foiEstornada: boolean;
}> {
  const motivo = params.motivo?.trim() || 'Cancelamento/Exclusão de Despesa';
  const usuarioId = params.usuarioId;
  const usuarioNome = params.usuarioNome || 'Sistema';
  const nowIso = new Date().toISOString();

  const docVeiculoRef = doc(db, COLLECTIONS.VEICULOS, params.veiculoId);

  return await runTransaction(db, async (transaction) => {
    // 1. Ler veículo
    const veiculoSnap = await transaction.get(docVeiculoRef);
    if (!veiculoSnap.exists()) {
      throw new Error('Veículo não encontrado.');
    }
    const veiculo = veiculoSnap.data() as Veiculo;
    const despesas = veiculo.despesas || [];
    const despesaIndex = despesas.findIndex((d) => d.id === params.despesaId);
    if (despesaIndex === -1) {
      throw new Error('Despesa não encontrada no veículo.');
    }
    const despesa = despesas[despesaIndex];

    // 2. Impedir um segundo estorno do mesmo pagamento
    if (
      despesa.statusPagamento === 'Estornada' ||
      despesa.statusPagamento === 'Cancelada' ||
      despesa.statusEstorno === 'Estornado' ||
      despesa.movimentacaoEstornoId
    ) {
      throw new Error('Esta despesa já foi estornada/cancelada anteriormente. Não é permitido estornar novamente.');
    }

    const valorDespesa = Number(despesa.valor || 0);
    const isPaga = despesa.statusPagamento === 'Pago' && Boolean(despesa.contaBancariaId);
    const afetaSaldo =
      isPaga &&
      despesa.naturezaTemporal !== 'historico_importado' &&
      !despesa.jaEstavaNoSaldoConferido &&
      valorDespesa > 0;

    let contaAtualizada: ContaBancariaCaixa | undefined;
    let movOriginalData: MovimentacaoConta | undefined;
    let movEstorno: MovimentacaoConta | undefined;
    let estornoMovId: string | undefined;

    if (afetaSaldo && despesa.contaBancariaId) {
      // 3. Ler Conta Bancária na mesma transação
      const docContaRef = doc(db, COLLECTIONS.CONTAS_BANCARIAS, despesa.contaBancariaId);
      const contaSnap = await transaction.get(docContaRef);
      if (!contaSnap.exists()) {
        throw new Error(`Conta bancária associada à despesa não encontrada.`);
      }
      const dataConta = contaSnap.data() as ContaBancariaCaixa;

      // 4. Ler Movimentação Original
      const movOriginalId = despesa.movimentacaoFinanceiraId || `mov_desp_${despesa.id}`;
      const docMovOriginalRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, movOriginalId);
      const movOriginalSnap = await transaction.get(docMovOriginalRef);

      if (movOriginalSnap.exists()) {
        movOriginalData = movOriginalSnap.data() as MovimentacaoConta;
        if (movOriginalData.movimentacaoEstornoId || movOriginalData.isEstorno) {
          throw new Error('A movimentação financeira desta despesa já possui um estorno registrado.');
        }
      }

      // 5. Verificar e impedir estorno duplicado na movimentação
      estornoMovId = `mov_estorno_desp_${despesa.id}`;
      const docMovEstornoRef = doc(db, COLLECTIONS.MOVIMENTACOES_CONTAS, estornoMovId);
      const movEstornoSnap = await transaction.get(docMovEstornoRef);
      if (movEstornoSnap.exists()) {
        throw new Error('O estorno desta despesa já foi processado anteriormente no extrato.');
      }

      // 6. Atualizar saldo operacional da conta
      const saldoAnterior = Number(dataConta.saldoAtualOperacional ?? dataConta.saldo ?? 0);
      const novoSaldo = saldoAnterior + valorDespesa;

      contaAtualizada = {
        ...dataConta,
        saldoAtualOperacional: novoSaldo,
        saldo: novoSaldo,
        saldoAtual: novoSaldo,
        updatedAt: nowIso,
      };

      transaction.update(docContaRef, {
        saldoAtualOperacional: novoSaldo,
        saldo: novoSaldo,
        saldoAtual: novoSaldo,
        updatedAt: nowIso,
      });

      // 7. Criar movimentação de estorno (valor de sinal contrário no extrato: Receita)
      movEstorno = {
        id: estornoMovId,
        idempotencyKey: `idemp_estorno_desp_${despesa.id}`,
        contaId: dataConta.id,
        contaNome: dataConta.nome,
        tipo: 'Receita', // sinal contrário da Despesa original
        categoria: 'Estorno de Lançamento',
        valor: valorDespesa,
        data: nowIso.split('T')[0],
        descricao: `Estorno de despesa cancelada: ${despesa.descricao || despesa.categoria} (${veiculo.placa || despesa.placa || ''}) - Motivo: ${motivo}`,
        veiculoId: veiculo.id,
        placa: veiculo.placa || despesa.placa,
        formaPagamento: despesa.formaPagamento || 'PIX',
        criadoPor: usuarioNome,
        createdAt: nowIso,
        afetaSaldoAtual: true,
        naturezaTemporal: 'operacao_atual',
        statusConciliacao: 'movimentacao_bancaria_confirmada',
        isEstorno: true,
        statusEstorno: 'Estornado',
        movimentacaoOriginalId: movOriginalSnap.exists() ? movOriginalId : undefined,
        motivoEstorno: motivo,
        dataHoraEstorno: nowIso,
        usuarioEstornoId: usuarioId,
        usuarioEstornoNome: usuarioNome,
        despesaVeiculoId: despesa.id,
      };
      transaction.set(docMovEstornoRef, movEstorno);

      // 8. Manter a movimentação original no extrato e vinculá-la ao estorno
      if (movOriginalSnap.exists()) {
        transaction.update(docMovOriginalRef, {
          movimentacaoEstornoId: estornoMovId,
          motivoEstorno: motivo,
          dataHoraEstorno: nowIso,
          usuarioEstornoId: usuarioId,
          usuarioEstornoNome: usuarioNome,
          isEstornado: true,
          statusEstorno: 'Estornado',
          updatedAt: nowIso,
        });
        movOriginalData = {
          ...movOriginalData,
          movimentacaoEstornoId: estornoMovId,
          motivoEstorno: motivo,
          dataHoraEstorno: nowIso,
          usuarioEstornoId: usuarioId,
          usuarioEstornoNome: usuarioNome,
          isEstornado: true,
          statusEstorno: 'Estornado',
        };
      }
    }

    // 9. Preservar a despesa com status Cancelada/Estornada e registrar auditoria
    const despesaAtualizada: DespesaVeiculo = {
      ...despesa,
      statusPagamento: afetaSaldo ? 'Estornada' : 'Cancelada',
      statusEstorno: afetaSaldo ? 'Estornado' : undefined,
      movimentacaoEstornoId: estornoMovId,
      motivoEstorno: motivo,
      dataHoraEstorno: nowIso,
      usuarioEstornoId: usuarioId,
      usuarioEstornoNome: usuarioNome,
      trilhaAuditoria: [
        ...(despesa.trilhaAuditoria || []),
        {
          dataHora: nowIso,
          usuarioId,
          usuarioNome,
          acao: afetaSaldo ? 'Estorno e Cancelamento de Despesa Paga' : 'Cancelamento de Despesa',
          detalhes: afetaSaldo
            ? `Estorno de R$ ${valorDespesa.toFixed(2)} creditado na conta ${despesa.contaBancariaNome || 'bancária'}. Motivo: ${motivo}`
            : `Despesa cancelada sem movimentação financeira. Motivo: ${motivo}`,
        },
      ],
    };

    const novasDespesas = [...despesas];
    novasDespesas[despesaIndex] = despesaAtualizada;

    const veiculoAtualizado: Veiculo = {
      ...veiculo,
      despesas: novasDespesas,
      updatedAt: nowIso,
    };

    transaction.update(docVeiculoRef, {
      despesas: novasDespesas,
      updatedAt: nowIso,
    });

    return {
      veiculoAtualizado,
      contaAtualizada,
      movimentacaoOriginal: movOriginalData,
      movimentacaoEstorno: movEstorno,
      foiEstornada: afetaSaldo,
    };
  });
}



