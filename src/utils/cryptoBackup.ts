/**
 * Utilitário de Criptografia e Backup de Segurança (AES-256-GCM + PBKDF2)
 * Garante a integridade, confidencialidade e portabilidade dos dados reais da revenda.
 */

export interface BackupMetadata {
  totalVeiculos: number;
  totalVendas: number;
  totalDespesasFixas: number;
  totalProfissoes?: number;
  valorTotalEstoque?: number;
  valorTotalVendas?: number;
  geradoPor?: string;
  loja?: string;
}

export interface EncryptedBackupPackage {
  format: 'TROCA_FACIL_ENCRYPTED_BACKUP';
  version: '1.0';
  algorithm: 'AES-256-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  createdAt: string;
  app: string;
  salt: string; // Base64
  iv: string; // Base64
  ciphertext: string; // Base64
  metadata: BackupMetadata;
}

export interface DecryptedBackupResult {
  data: {
    veiculos: any[];
    vendas: any[];
    despesasFixas: any[];
    profissoes?: string[];
    exportedAt: string;
    appVersion: string;
  };
  metadata: BackupMetadata;
  createdAt: string;
}

// Conversores de ArrayBuffer / Uint8Array para Base64
function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Deriva uma chave AES-GCM de 256 bits a partir de uma senha e salt usando PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array, iterations = 100000): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const importedKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256',
    },
    importedKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Criptografa o payload de dados completo da loja usando AES-256-GCM
 */
export async function createEncryptedBackup(
  payload: {
    veiculos: any[];
    vendas: any[];
    despesasFixas: any[];
    profissoes?: string[];
    [key: string]: any;
  },
  password: string,
  extraMetadata?: Partial<BackupMetadata>
): Promise<EncryptedBackupPackage> {
  if (!password || password.trim().length === 0) {
    throw new Error('A senha de proteção do backup é obrigatória.');
  }

  // 1. Gerar Salt aleatório (16 bytes) e IV (12 bytes para AES-GCM)
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  // 2. Derivar chave criptográfica
  const iterations = 100000;
  const key = await deriveKey(password, salt, iterations);

  // 3. Preparar dados com carimbo de tempo
  const dataToEncrypt = {
    veiculos: payload.veiculos || [],
    vendas: payload.vendas || [],
    despesasFixas: payload.despesasFixas || [],
    profissoes: payload.profissoes || [],
    exportedAt: new Date().toISOString(),
    appVersion: '2.5.0',
  };

  const encoder = new TextEncoder();
  const plaintextBuffer = encoder.encode(JSON.stringify(dataToEncrypt));

  // 4. Executar criptografia AES-GCM
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    plaintextBuffer
  );

  // 5. Calcular metadados para auditoria rápida
  const valorTotalEstoque = (payload.veiculos || []).reduce(
    (acc, v) => acc + (Number(v.precoVenda) || Number(v.valorCompra) || 0),
    0
  );
  const valorTotalVendas = (payload.vendas || []).reduce(
    (acc, v) => acc + (Number(v.valorVenda) || 0),
    0
  );

  const metadata: BackupMetadata = {
    totalVeiculos: (payload.veiculos || []).length,
    totalVendas: (payload.vendas || []).length,
    totalDespesasFixas: (payload.despesasFixas || []).length,
    totalProfissoes: (payload.profissoes || []).length,
    valorTotalEstoque,
    valorTotalVendas,
    geradoPor: extraMetadata?.geradoPor || 'Administrador',
    loja: extraMetadata?.loja || 'TROCA FÁCIL PRO',
  };

  // 6. Pacote final serializável
  const backupPackage: EncryptedBackupPackage = {
    format: 'TROCA_FACIL_ENCRYPTED_BACKUP',
    version: '1.0',
    algorithm: 'AES-256-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations,
    createdAt: new Date().toISOString(),
    app: 'Troca Fácil PRO - Gestão de Estoque e Vendas',
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    metadata,
  };

  return backupPackage;
}

/**
 * Descriptografa e valida um pacote de backup usando a senha informada
 */
export async function decryptBackup(
  backupPackage: EncryptedBackupPackage | string,
  password: string
): Promise<DecryptedBackupResult> {
  let pkg: EncryptedBackupPackage;

  if (typeof backupPackage === 'string') {
    try {
      pkg = JSON.parse(backupPackage);
    } catch {
      throw new Error('O arquivo selecionado não contém um formato JSON válido.');
    }
  } else {
    pkg = backupPackage;
  }

  if (pkg.format !== 'TROCA_FACIL_ENCRYPTED_BACKUP') {
    throw new Error('O arquivo selecionado não é um backup válido do Troca Fácil PRO.');
  }

  if (!pkg.salt || !pkg.iv || !pkg.ciphertext) {
    throw new Error('O arquivo de backup está corrompido ou incompleto (faltam chaves criptográficas).');
  }

  try {
    const salt = new Uint8Array(base64ToArrayBuffer(pkg.salt));
    const iv = new Uint8Array(base64ToArrayBuffer(pkg.iv));
    const ciphertext = base64ToArrayBuffer(pkg.ciphertext);

    const key = await deriveKey(password, salt, pkg.iterations || 100000);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    const jsonString = decoder.decode(decryptedBuffer);
    const data = JSON.parse(jsonString);

    return {
      data,
      metadata: pkg.metadata || {
        totalVeiculos: data.veiculos?.length || 0,
        totalVendas: data.vendas?.length || 0,
        totalDespesasFixas: data.despesasFixas?.length || 0,
      },
      createdAt: pkg.createdAt,
    };
  } catch (err: any) {
    // AES-GCM lança erro de autenticação quando a chave/senha está errada ou dados foram adulterados
    console.error('Falha na descriptografia:', err);
    throw new Error('Senha incorreta ou integridade do arquivo violada.');
  }
}

/**
 * Dispara o download local do arquivo JSON criptografado no navegador
 */
export function downloadBackupFile(backupPackage: EncryptedBackupPackage, customName?: string) {
  const jsonContent = JSON.stringify(backupPackage, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = customName || `Backup_Seguranca_TrocaFacil_${dateStr}_AES256.json`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
