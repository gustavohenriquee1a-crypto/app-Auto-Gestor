import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDoc,
  writeBatch,
  query,
  orderBy,
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
  MovimentacaoConta,
  DespesaVeiculo,
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
};

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
        const data = docSnap.data() as Veiculo;
        if (data && (data.id || data.placa)) {
          items.push({
            ...data,
            id: data.id || docSnap.id,
          });
        }
      });
      // Sort newest first by dataEntrada
      items.sort((a, b) => {
        const timeA = a.dataEntrada ? new Date(a.dataEntrada).getTime() : 0;
        const timeB = b.dataEntrada ? new Date(b.dataEntrada).getTime() : 0;
        return timeB - timeA;
      });
      onData(items);
    },
    (err) => {
      console.error('Error fetching veiculos from Firestore:', err);
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
        const data = docSnap.data() as VendaVeiculo;
        if (data && (data.id || data.placa)) {
          items.push({
            ...data,
            id: data.id || docSnap.id,
          });
        }
      });
      items.sort((a, b) => {
        const timeA = a.dataVenda ? new Date(a.dataVenda).getTime() : 0;
        const timeB = b.dataVenda ? new Date(b.dataVenda).getTime() : 0;
        return timeB - timeA;
      });
      onData(items);
    },
    (err) => {
      console.error('Error fetching vendas from Firestore:', err);
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
        const data = docSnap.data() as DespesaFixa;
        if (data && (data.id || data.descricao)) {
          items.push({
            ...data,
            id: data.id || docSnap.id,
          });
        }
      });
      onData(items);
    },
    (err) => {
      console.error('Error fetching despesasFixas from Firestore:', err);
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

export async function saveVeiculoFirestore(veiculo: Veiculo): Promise<void> {
  const docRef = doc(db, COLLECTIONS.VEICULOS, veiculo.id);
  // Clean undefined properties before saving to firestore
  const cleanData: any = JSON.parse(JSON.stringify(veiculo));

  // Explicitly assign null to fields that were cleared so Firestore updates and removes old values
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
  endereco: 'RUA NICOLAU CACCIATORI, 477, JD DOS PIONEIROS, CEP: 19.050-340, PRESIDENTE PRUDENTE-SP',
  cidadeUf: 'Presidente Prudente - SP',
  telefone: '(18) 3222-0000',
  logoUrl: '',
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
        const contas = snapshot.docs.map((docSnap) => ({
          ...docSnap.data(),
          id: docSnap.id,
        })) as ContaBancariaCaixa[];
        onData(contas);
      } else {
        // Se ainda não houver contas no Firestore, carrega do localStorage ou inicial padrão
        try {
          const localSaved = localStorage.getItem('autogestor_contas_bancarias');
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              onData(parsed);
              return;
            }
          }
        } catch (e) {
          console.error(e);
        }
        onData(DEFAULT_CONTAS_BANCARIAS);
      }
    },
    (error) => {
      console.warn('Erro ao escutar contas bancárias no Firestore:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Salva ou atualiza uma Conta Bancária no Firestore
 */
export async function saveContaBancariaFirestore(
  conta: ContaBancariaCaixa
): Promise<void> {
  try {
    const id = conta.id || `conta_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const docRef = doc(db, COLLECTIONS.CONTAS_BANCARIAS, id);
    const clean = JSON.parse(JSON.stringify({
      ...conta,
      id,
      updatedAt: new Date().toISOString(),
    }));
    await setDoc(docRef, clean, { merge: true });
  } catch (error) {
    console.error('Erro ao salvar conta bancária no Firestore:', error);
    throw error;
  }
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
      const movs = snapshot.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as MovimentacaoConta[];

      // Ordenar por data mais recente primeiro
      movs.sort((a, b) => new Date(b.createdAt || b.data).getTime() - new Date(a.createdAt || a.data).getTime());
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

  // 1. Obter todas as contas bancárias atuais
  const contasSnap = await getDocs(collection(db, COLLECTIONS.CONTAS_BANCARIAS));
  const contasMap = new Map<string, ContaBancariaCaixa>();

  if (!contasSnap.empty) {
    contasSnap.docs.forEach((d) => {
      contasMap.set(d.id, { ...d.data(), id: d.id } as ContaBancariaCaixa);
    });
  } else {
    DEFAULT_CONTAS_BANCARIAS.forEach((c) => contasMap.set(c.id, { ...c }));
  }

  // Localizar Conta de Origem
  let contaOrigem = contasMap.get(contaOrigemId);
  if (!contaOrigem) {
    const fallbackOrigem = DEFAULT_CONTAS_BANCARIAS.find((c) => c.id === contaOrigemId);
    if (fallbackOrigem) {
      contaOrigem = { ...fallbackOrigem };
    } else {
      throw new Error(`Conta de Origem com ID "${contaOrigemId}" não foi encontrada.`);
    }
  }

  // 2. Processar débito na Conta de Origem
  const saldoAnteriorOrigem = Number(contaOrigem.saldo || 0);
  const novoSaldoOrigem = saldoAnteriorOrigem - valor;

  const contaOrigemAtualizada: ContaBancariaCaixa = {
    ...contaOrigem,
    saldo: novoSaldoOrigem,
    updatedAt: new Date().toISOString(),
  };
  await saveContaBancariaFirestore(contaOrigemAtualizada);

  // 3. Processar crédito na Conta de Destino (se interna)
  let contaDestinoAtualizada: ContaBancariaCaixa | undefined;
  let contaDestino: ContaBancariaCaixa | undefined;

  if (!isTerceiro && contaDestinoId) {
    contaDestino = contasMap.get(contaDestinoId);
    if (!contaDestino) {
      const fallbackDestino = DEFAULT_CONTAS_BANCARIAS.find((c) => c.id === contaDestinoId);
      if (fallbackDestino) {
        contaDestino = { ...fallbackDestino };
      } else {
        throw new Error(`Conta de Destino com ID "${contaDestinoId}" não foi encontrada.`);
      }
    }

    const saldoAnteriorDestino = Number(contaDestino.saldo || 0);
    const novoSaldoDestino = saldoAnteriorDestino + valor;

    contaDestinoAtualizada = {
      ...contaDestino,
      saldo: novoSaldoDestino,
      updatedAt: new Date().toISOString(),
    };
    await saveContaBancariaFirestore(contaDestinoAtualizada);
  }

  // 4. Gerar registros no Extrato (Movimentações de Contas)
  const idTransferencia = `transf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const dataMov = data || new Date().toISOString().split('T')[0];

  // A) Extrato Conta Origem (Débito)
  const descricaoOrigem = isTerceiro
    ? `Transferência para Terceiro: ${terceiroDestinoNome?.trim()} - Motivo: ${motivo.trim()}`
    : `Transferência enviada para ${contaDestino?.nome || 'Conta Destino'} - Motivo: ${motivo.trim()}`;

  const movimentacaoOrigem: MovimentacaoConta = {
    id: `mov_deb_${idTransferencia}`,
    contaId: contaOrigem.id,
    contaNome: contaOrigem.nome,
    tipo: 'Transferência',
    categoria: isTerceiro ? 'Transferência para Terceiros' : 'Transferência entre Contas',
    valor: valor,
    data: dataMov,
    descricao: descricaoOrigem,
    formaPagamento: 'Transferência Bancária / PIX',
    criadoPor: usuarioNome,
    createdAt: new Date().toISOString(),
    transferenciaId: idTransferencia,
    contaOrigemId: contaOrigem.id,
    contaOrigemNome: contaOrigem.nome,
    contaDestinoId: isTerceiro ? undefined : contaDestino?.id,
    contaDestinoNome: isTerceiro ? undefined : contaDestino?.nome,
    isTerceiro,
    terceiroNome: isTerceiro ? terceiroDestinoNome?.trim() : undefined,
    motivo: motivo.trim(),
  };
  await saveMovimentacaoContaFirestore(movimentacaoOrigem);

  // B) Extrato Conta Destino (Crédito, se interna)
  let movimentacaoDestino: MovimentacaoConta | undefined;
  if (!isTerceiro && contaDestino) {
    const descricaoDestino = `Transferência recebida de ${contaOrigem.nome} - Motivo: ${motivo.trim()}`;

    movimentacaoDestino = {
      id: `mov_cred_${idTransferencia}`,
      contaId: contaDestino.id,
      contaNome: contaDestino.nome,
      tipo: 'Transferência',
      categoria: 'Transferência entre Contas',
      valor: valor,
      data: dataMov,
      descricao: descricaoDestino,
      formaPagamento: 'Transferência Bancária / PIX',
      criadoPor: usuarioNome,
      createdAt: new Date().toISOString(),
      transferenciaId: idTransferencia,
      contaOrigemId: contaOrigem.id,
      contaOrigemNome: contaOrigem.nome,
      contaDestinoId: contaDestino.id,
      contaDestinoNome: contaDestino.nome,
      isTerceiro: false,
      motivo: motivo.trim(),
    };
    await saveMovimentacaoContaFirestore(movimentacaoDestino);
  }

  return {
    contaOrigemAtualizada,
    contaDestinoAtualizada,
    movimentacaoOrigem,
    movimentacaoDestino,
  };
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
    // 1. Obter todas as contas bancárias atuais para poder atualizar saldos
    const contasSnap = await getDocs(collection(db, COLLECTIONS.CONTAS_BANCARIAS));
    let contasMap = new Map<string, ContaBancariaCaixa>();

    if (!contasSnap.empty) {
      contasSnap.docs.forEach((d) => {
        const c = { ...d.data(), id: d.id } as ContaBancariaCaixa;
        contasMap.set(c.id, c);
        // Também indexar pelo nome normalizado para match robusto
        contasMap.set(c.nome.trim().toLowerCase(), c);
      });
    } else {
      // Se Firestore ainda não tem contas persistidas, popula com default
      DEFAULT_CONTAS_BANCARIAS.forEach((c) => {
        contasMap.set(c.id, c);
        contasMap.set(c.nome.trim().toLowerCase(), c);
      });
    }

    // Helper para encontrar ou criar conta destino
    const findOrCreateTargetAccount = (
      contaIdOrName?: string
    ): ContaBancariaCaixa => {
      if (contaIdOrName) {
        if (contasMap.has(contaIdOrName)) {
          return contasMap.get(contaIdOrName)!;
        }
        const lower = contaIdOrName.trim().toLowerCase();
        if (contasMap.has(lower)) {
          return contasMap.get(lower)!;
        }
        // Busca parcial
        for (const [key, val] of contasMap.entries()) {
          if (typeof key === 'string' && (key.includes(lower) || lower.includes(key))) {
            return val;
          }
        }
      }
      // Fallback: primeira conta ou Conta Itaú Principal
      const itau = contasMap.get('conta_itau_pj');
      if (itau) return itau;
      return DEFAULT_CONTAS_BANCARIAS[0];
    };

    const pagamentosAReceber: Array<{
      valor: number;
      forma: string;
      contaNome: string;
      contaId: string;
      detalhes?: string;
    }> = [];

    // MODO HÍBRIDO
    if (venda.composicaoPagamento && venda.composicaoPagamento.length > 0) {
      venda.composicaoPagamento.forEach((p) => {
        // Filtra meios financeiros líquidos que entram na conta da loja (PIX, TED, Dinheiro, Cartão)
        if (
          p.tipo === 'PIX' ||
          p.tipo === 'TED/Transferência' ||
          p.tipo === 'Dinheiro Espécie' ||
          p.tipo === 'Cartão de Crédito' ||
          p.tipo === 'Cartão de Débito'
        ) {
          const val = p.valorLiquido > 0 ? p.valorLiquido : p.valorBruto;
          if (val > 0) {
            const target = findOrCreateTargetAccount(p.bancoDestino || p.contaBancariaId || venda.contaBancariaDestinoNome);
            pagamentosAReceber.push({
              valor: val,
              forma: p.tipo,
              contaNome: target.nome,
              contaId: target.id,
              detalhes: p.detalhes,
            });
          }
        }
      });
    } else {
      // MODO SIMPLES
      if (venda.formaPagamento === 'À Vista PIX' || venda.formaPagamento === 'Dinheiro') {
        const target = findOrCreateTargetAccount(venda.contaBancariaDestinoNome || venda.contaBancariaDestinoId);
        pagamentosAReceber.push({
          valor: venda.valorVenda,
          forma: venda.formaPagamento,
          contaNome: target.nome,
          contaId: target.id,
        });
      } else if (venda.formaPagamento === 'Financiamento' || venda.formaPagamento === 'Troca + Volta') {
        // Se houver valor de entrada em dinheiro/PIX registrado nos detalhes de financiamento
        if (venda.financiamentoDetalhes && venda.financiamentoDetalhes.valorEntrada > 0) {
          const target = findOrCreateTargetAccount(
            venda.financiamentoDetalhes.contaDestinoEntrada || venda.contaBancariaDestinoNome
          );
          pagamentosAReceber.push({
            valor: venda.financiamentoDetalhes.valorEntrada,
            forma: 'Entrada Financiamento (PIX/Transferência)',
            contaNome: target.nome,
            contaId: target.id,
          });
        }
      }
    }

    // Processar cada recebimento: creditar na conta e registrar no extrato
    for (const pag of pagamentosAReceber) {
      const targetConta = findOrCreateTargetAccount(pag.contaId);
      const novoSaldo = (targetConta.saldo || 0) + pag.valor;

      // 1. Atualizar saldo da Conta Bancária no Firestore
      const updatedConta: ContaBancariaCaixa = {
        ...targetConta,
        saldo: novoSaldo,
        updatedAt: new Date().toISOString(),
      };
      await saveContaBancariaFirestore(updatedConta);
      contasMap.set(targetConta.id, updatedConta);

      // 2. Criar registro detalhado no Extrato / Movimentações de Contas
      const movId = `mov_venda_${venda.id}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
      const novaMovimentacao: MovimentacaoConta = {
        id: movId,
        contaId: targetConta.id,
        contaNome: targetConta.nome,
        tipo: 'Receita',
        categoria: 'Venda de Veículo',
        valor: pag.valor,
        data: venda.dataVenda || new Date().toISOString().split('T')[0],
        descricao: `Recebimento de ${pag.forma} referente à venda do veículo ${veiculo.modelo || venda.modelo} - Placa: ${veiculo.placa || venda.placa} - Cliente: ${venda.compradorNome}`,
        vinculoVendaId: venda.id,
        veiculoId: veiculo.id || venda.veiculoId,
        placa: veiculo.placa || venda.placa,
        clienteNome: venda.compradorNome,
        formaPagamento: pag.forma,
        criadoPor: usuarioNome,
        createdAt: new Date().toISOString(),
      };

      await saveMovimentacaoContaFirestore(novaMovimentacao);
      console.log(`Recebimento financeiro processado com sucesso: +R$ ${pag.valor} creditado em ${targetConta.nome}`);
    }
  } catch (error) {
    console.error('Erro ao processar integração financeira da venda:', error);
    // Não interrompe o fluxo de venda se houver erro não fatal
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

  try {
    const contasSnap = await getDocs(collection(db, COLLECTIONS.CONTAS_BANCARIAS));
    let targetConta: ContaBancariaCaixa | null = null;

    if (!contasSnap.empty) {
      for (const d of contasSnap.docs) {
        if (d.id === despesa.contaBancariaId) {
          targetConta = { ...d.data(), id: d.id } as ContaBancariaCaixa;
          break;
        }
      }
    }

    if (!targetConta) {
      const defaultMatch = DEFAULT_CONTAS_BANCARIAS.find((c) => c.id === despesa.contaBancariaId);
      if (defaultMatch) {
        targetConta = { ...defaultMatch };
      }
    }

    if (!targetConta) {
      console.warn(`Conta bancária ${despesa.contaBancariaId} não encontrada para processar débito de despesa.`);
      return;
    }

    const valorDespesa = Number(despesa.valor || 0);
    if (valorDespesa <= 0) return;

    // 1. Descontar o valor do saldo principal da conta
    const saldoAnterior = Number(targetConta.saldo || 0);
    const novoSaldo = saldoAnterior - valorDespesa;

    const updatedConta: ContaBancariaCaixa = {
      ...targetConta,
      saldo: novoSaldo,
      updatedAt: new Date().toISOString(),
    };
    await saveContaBancariaFirestore(updatedConta);

    // 2. Gerar o registro no extrato bancário
    const placaStr = veiculo.placa || despesa.placa || 'Sem Placa';
    const fornecedorStr = despesa.fornecedor || 'Fornecedor Parceiro';
    const categoriaStr = despesa.categoria || 'Despesa';
    const dataPagamentoStr = despesa.dataPagamento || despesa.data || new Date().toISOString().split('T')[0];

    // Histórico exato solicitado: "Pagamento de Despesa: [Categoria] - Fornecedor: [Nome] - Veículo: [Placa]"
    const historicoTexto = `Pagamento de Despesa: ${categoriaStr} - Fornecedor: ${fornecedorStr} - Veículo: ${placaStr}`;

    const movId = `mov_desp_${despesa.id || Date.now()}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const novaMovimentacao: MovimentacaoConta = {
      id: movId,
      contaId: targetConta.id,
      contaNome: targetConta.nome,
      tipo: 'Despesa',
      categoria: categoriaStr,
      valor: valorDespesa,
      data: dataPagamentoStr,
      descricao: historicoTexto,
      veiculoId: veiculo.id || despesa.veiculoId,
      placa: placaStr,
      formaPagamento: despesa.formaPagamento || 'PIX',
      criadoPor: usuarioNome,
      createdAt: new Date().toISOString(),
    };

    await saveMovimentacaoContaFirestore(novaMovimentacao);
    console.log(`Débito financeiro efetuado com sucesso: -R$ ${valorDespesa} em ${targetConta.nome} (${historicoTexto})`);
  } catch (error) {
    console.error('Erro ao processar débito financeiro da despesa:', error);
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
  } = params;

  // 1. Obter a conta bancária de destino
  let targetConta: ContaBancariaCaixa | null = null;
  const contasSnap = await getDocs(collection(db, COLLECTIONS.CONTAS_BANCARIAS));
  if (!contasSnap.empty) {
    for (const d of contasSnap.docs) {
      if (d.id === contaBancariaId) {
        targetConta = { ...d.data(), id: d.id } as ContaBancariaCaixa;
        break;
      }
    }
  }

  if (!targetConta) {
    const defaultMatch = DEFAULT_CONTAS_BANCARIAS.find((c) => c.id === contaBancariaId);
    if (defaultMatch) {
      targetConta = { ...defaultMatch };
    }
  }

  if (!targetConta) {
    // Se não encontrou por ID, buscar a primeira conta disponível
    targetConta = DEFAULT_CONTAS_BANCARIAS[0];
  }

  // 2. Atualizar saldo da conta bancária (+ crédito)
  const saldoAnterior = Number(targetConta.saldo || 0);
  const novoSaldo = saldoAnterior + Number(valorLiquidado || 0);

  const contaAtualizada: ContaBancariaCaixa = {
    ...targetConta,
    saldo: novoSaldo,
    updatedAt: new Date().toISOString(),
  };
  await saveContaBancariaFirestore(contaAtualizada);

  // 3. Montar Histórico e Descrição do Extrato
  const bancoNome =
    venda.financiamentoDetalhes?.bancoParceiroNome ||
    venda.financiamentoDetalhes?.bancoParceiro ||
    'Banco Financiador';
  const placaVeiculo = venda.placa || 'Sem Placa';
  const compradorNome = venda.compradorNome || 'Cliente Comprador';

  let descricaoExtrato = '';
  let categoriaExtrato = '';

  if (tipoTitulo === 'financiamento') {
    categoriaExtrato = 'Liquidação de Financiamento';
    descricaoExtrato = `Liquidação de Financiamento: ${bancoNome} - Veículo: ${placaVeiculo} - Cliente: ${compradorNome}`;
  } else if (tipoTitulo === 'tac') {
    categoriaExtrato = 'Recebimento TAC / Retorno';
    descricaoExtrato = `Recebimento de Retorno/TAC: ${bancoNome} - Veículo: ${placaVeiculo} - Cliente: ${compradorNome}`;
  } else {
    categoriaExtrato = 'Recebimento de Venda';
    descricaoExtrato = `Liquidação de Recebível: ${formaLiquidacao} - Veículo: ${placaVeiculo} - Cliente: ${compradorNome}`;
  }

  if (observacoes.trim()) {
    descricaoExtrato += ` (${observacoes.trim()})`;
  }

  // 4. Criar registro no Extrato Bancário (Entrada / Receita)
  const movId = `mov_rec_${venda.id}_${tipoTitulo}_${Date.now()}`;
  const novaMovimentacao: MovimentacaoConta = {
    id: movId,
    contaId: targetConta.id,
    contaNome: targetConta.nome,
    tipo: 'Receita',
    categoria: categoriaExtrato,
    valor: Number(valorLiquidado || 0),
    data: dataLiquidacao || new Date().toISOString().split('T')[0],
    descricao: descricaoExtrato,
    vinculoVendaId: venda.id,
    veiculoId: venda.veiculoId,
    placa: placaVeiculo,
    clienteNome: compradorNome,
    formaPagamento: formaLiquidacao,
    criadoPor: usuarioNome,
    createdAt: new Date().toISOString(),
  };
  await saveMovimentacaoContaFirestore(novaMovimentacao);

  // 5. Atualizar objeto Venda
  const updatedFinanciamento = {
    ...(venda.financiamentoDetalhes || {
      bancoParceiro: 'BV',
      valorEntrada: 0,
      valorFinanciado: 0,
      retornoComissaoBanco: 0,
    }),
  };

  if (tipoTitulo === 'financiamento') {
    updatedFinanciamento.statusLiquidacaoFinanciamento = 'Recebido';
    updatedFinanciamento.dataLiquidacaoFinanciamento = dataLiquidacao;
    updatedFinanciamento.contaBancariaLiquidacaoId = targetConta.id;
    updatedFinanciamento.contaBancariaLiquidacaoNome = targetConta.nome;
    updatedFinanciamento.formaLiquidacaoFinanciamento = formaLiquidacao;
  } else if (tipoTitulo === 'tac') {
    updatedFinanciamento.statusLiquidacaoTac = 'Recebido';
    updatedFinanciamento.dataLiquidacaoTac = dataLiquidacao;
    updatedFinanciamento.contaBancariaTacId = targetConta.id;
    updatedFinanciamento.contaBancariaTacNome = targetConta.nome;
    updatedFinanciamento.formaLiquidacaoTac = formaLiquidacao;
  }

  if (observacoes.trim()) {
    updatedFinanciamento.observacoesLiquidacao =
      (updatedFinanciamento.observacoesLiquidacao ? updatedFinanciamento.observacoesLiquidacao + ' | ' : '') +
      observacoes.trim();
  }

  const vendaAtualizada: VendaVeiculo = {
    ...venda,
    financiamentoDetalhes: updatedFinanciamento,
  };

  await saveVendaFirestore(vendaAtualizada);
  console.log(`Liquidação de ${tipoTitulo} processada com sucesso: +R$ ${valorLiquidado} creditado em ${targetConta.nome}`);

  return {
    vendaAtualizada,
    contaAtualizada,
    movimentacao: novaMovimentacao,
  };
}


