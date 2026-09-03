import React, { useState, useRef } from 'react';
import {
  Shield,
  Lock,
  Key,
  Download,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Database,
  HardDrive,
  FileJson,
  Clock,
  Eye,
  EyeOff,
  RefreshCw,
  FileText,
  X,
  Car,
  DollarSign,
  Users,
  ShieldCheck,
  Check,
  Info,
  Sparkles,
  Layers,
  Calendar
} from 'lucide-react';
import { Veiculo, VendaVeiculo, DespesaFixa, Usuario } from '../types';
import {
  createEncryptedBackup,
  decryptBackup,
  downloadBackupFile,
  EncryptedBackupPackage,
  DecryptedBackupResult
} from '../utils/cryptoBackup';
import { restoreDataToFirestore } from '../services/firestoreService';

interface ModalBackupSegurancaProps {
  isOpen: boolean;
  onClose: () => void;
  veiculos: Veiculo[];
  vendas: VendaVeiculo[];
  despesasFixas: DespesaFixa[];
  profissoes?: string[];
  currentUser: Usuario | null;
  onDataRestored?: () => void;
}

type TabType = 'export' | 'restore' | 'policies';

export const ModalBackupSeguranca: React.FC<ModalBackupSegurancaProps> = ({
  isOpen,
  onClose,
  veiculos,
  vendas,
  despesasFixas,
  profissoes = [],
  currentUser,
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('export');

  // --- Export State ---
  const [exportPassword, setExportPassword] = useState('');
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMessage, setExportSuccessMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // --- Restore State ---
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileContent, setUploadedFileContent] = useState<string | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  const [showRestorePassword, setShowRestorePassword] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedResult, setDecryptedResult] = useState<DecryptedBackupResult | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoringData, setIsRestoringData] = useState(false);
  const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Last backup tracker from localStorage
  const lastBackupDate = localStorage.getItem('troca_facil_last_backup_date');

  if (!isOpen) return null;

  // Real-time calculations for stats
  const totalVeiculosEstoque = veiculos.filter((v) => v.status === 'disponivel').length;
  const totalVeiculosAlugados = veiculos.filter((v) => v.status === 'alugado').length;
  const totalVeiculosVendidos = veiculos.filter((v) => v.status === 'vendido').length;
  const totalDespesasVeiculosCount = veiculos.reduce((acc, v) => acc + (v.despesas?.length || 0), 0);

  const valorTotalEstoque = veiculos
    .filter((v) => v.status === 'disponivel')
    .reduce((acc, v) => acc + (Number(v.precoVenda) || Number(v.valorCompra) || 0), 0);

  const valorTotalVendasRealizadas = vendas.reduce(
    (acc, v) => acc + (Number(v.valorVenda) || 0),
    0
  );

  // Export Action
  const handleGenerateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setExportError(null);
    setExportSuccessMessage(null);

    if (!exportPassword || exportPassword.length < 6) {
      setExportError('A senha deve conter no mínimo 6 caracteres para garantir a segurança criptográfica.');
      return;
    }

    if (exportPassword !== exportPasswordConfirm) {
      setExportError('As senhas digitadas não coincidem. Verifique e tente novamente.');
      return;
    }

    try {
      setIsExporting(true);

      const payload = {
        veiculos,
        vendas,
        despesasFixas,
        profissoes,
      };

      const encryptedPackage = await createEncryptedBackup(payload, exportPassword, {
        geradoPor: currentUser?.displayName || currentUser?.email || 'Administrador',
        loja: 'TROCA FÁCIL PRO',
      });

      // Dispara download do arquivo JSON criptografado
      downloadBackupFile(encryptedPackage);

      const nowStr = new Date().toLocaleString('pt-BR');
      localStorage.setItem('troca_facil_last_backup_date', nowStr);
      setExportSuccessMessage(`Backup gerado e baixado com sucesso! Guarde este arquivo e a senha em local seguro.`);
      
      // Limpa campos sensíveis
      setExportPassword('');
      setExportPasswordConfirm('');
    } catch (err: any) {
      console.error('Erro ao gerar backup:', err);
      setExportError(err.message || 'Falha ao criptografar o backup.');
    } finally {
      setIsExporting(false);
    }
  };

  // Upload File Selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError(null);
    setDecryptedResult(null);
    setRestoreSuccessMessage(null);

    if (!file.name.endsWith('.json') && !file.name.endsWith('.tfbackup')) {
      setRestoreError('Por favor, selecione um arquivo de backup com extensão .json.');
      return;
    }

    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUploadedFileContent(content);
    };
    reader.onerror = () => {
      setRestoreError('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
  };

  // Decrypt File Action
  const handleDecryptFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setRestoreError(null);
    setRestoreSuccessMessage(null);

    if (!uploadedFileContent) {
      setRestoreError('Nenhum arquivo de backup foi carregado.');
      return;
    }

    if (!restorePassword) {
      setRestoreError('Informe a senha usada para criptografar este arquivo de backup.');
      return;
    }

    try {
      setIsDecrypting(true);
      const result = await decryptBackup(uploadedFileContent, restorePassword);
      setDecryptedResult(result);
    } catch (err: any) {
      setRestoreError(err.message || 'Falha ao descriptografar. Senha incorreta ou arquivo corrompido.');
      setDecryptedResult(null);
    } finally {
      setIsDecrypting(false);
    }
  };

  // Restore into Firestore / System
  const handleConfirmRestore = async () => {
    if (!decryptedResult) return;

    const confirmMsg = restoreMode === 'replace'
      ? 'ATENÇÃO: A restauração em modo "Substituição Total" irá sobrescrever todos os veículos, vendas e despesas atuais pelos dados deste backup. Deseja prosseguir?'
      : 'Deseja mesclar os registros do backup com os dados existentes no sistema?';

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setIsRestoringData(true);
      setRestoreError(null);

      const res = await restoreDataToFirestore(
        {
          veiculos: decryptedResult.data.veiculos || [],
          vendas: decryptedResult.data.vendas || [],
          despesasFixas: decryptedResult.data.despesasFixas || [],
          profissoes: decryptedResult.data.profissoes || [],
        },
        restoreMode
      );

      setRestoreSuccessMessage(
        `Restauração concluída com sucesso! ${res.veiculosRestaurados} veículos, ${res.vendasRestauradas} vendas e ${res.despesasRestauradas} despesas sincronizados com a nuvem.`
      );

      if (onDataRestored) {
        onDataRestored();
      }
    } catch (err: any) {
      console.error('Erro ao restaurar dados:', err);
      setRestoreError('Falha ao gravar os dados no Firestore: ' + (err.message || 'Erro desconhecido.'));
    } finally {
      setIsRestoringData(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-gray-900 rounded-2xl shadow-xl overflow-hidden border border-white/10">
        {/* Header */}
        <div className="px-6 py-5 bg-[#161720] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <Shield size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Backup de Segurança dos Dados
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  AES-256-GCM
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Exportação criptografada militar e restauração de dados reais da loja
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/5 bg-[#13141c] px-6 pt-2 shrink-0">
          <button
            onClick={() => setActiveTab('export')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-500 text-emerald-400 bg-white/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download size={14} />
            <span>Criar Backup Criptografado</span>
          </button>

          <button
            onClick={() => setActiveTab('restore')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'restore'
                ? 'border-blue-500 text-blue-400 bg-white/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload size={14} />
            <span>Restaurar / Inspecionar Backup</span>
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            className={`px-4 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
              activeTab === 'policies'
                ? 'border-purple-500 text-purple-400 bg-white/[0.02]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck size={14} />
            <span>Diretrizes de Segurança</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              {/* Snapshot Card */}
              <div className="bg-[#161722] border border-white/5 rounded-2xl p-4.5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Database size={16} className="text-emerald-400" />
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Volume de Dados Atuais no Backup
                    </span>
                  </div>
                  {lastBackupDate && (
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock size={12} className="text-emerald-400" />
                      Último backup: {lastBackupDate}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#0e0f14] p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Veículos Cadastrados</p>
                    <p className="text-xl font-black text-white mt-0.5">{veiculos.length}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {totalVeiculosEstoque} pátio • {totalDespesasVeiculosCount} desp. oficina
                    </p>
                  </div>

                  <div className="bg-[#0e0f14] p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Vendas Realizadas</p>
                    <p className="text-xl font-black text-emerald-400 mt-0.5">{vendas.length}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Histórico completo + CRM
                    </p>
                  </div>

                  <div className="bg-[#0e0f14] p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">Despesas Fixas</p>
                    <p className="text-xl font-black text-amber-400 mt-0.5">{despesasFixas.length}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Estruturais & Contábeis
                    </p>
                  </div>

                  <div className="bg-[#0e0f14] p-3 rounded-xl border border-white/5">
                    <p className="text-[10px] text-slate-400 font-semibold uppercase">CRM & Profissões</p>
                    <p className="text-xl font-black text-purple-400 mt-0.5">{profissoes.length}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Segmentos de clientes
                    </p>
                  </div>
                </div>
              </div>

              {/* Form de Criptografia */}
              <form onSubmit={handleGenerateBackup} className="space-y-4">
                <div className="bg-[#181924] border border-emerald-500/20 rounded-2xl p-4.5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                        Proteção por Senha Criptográfica
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                        O arquivo será protegido com algoritmo <strong>AES-256-GCM</strong> e derivação de chave <strong>PBKDF2 com 100.000 iterações</strong>. Ninguém conseguirá abrir o arquivo JSON sem a senha definida abaixo.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Senha de Criptografia *
                      </label>
                      <div className="relative">
                        <input
                          id="input-export-password"
                          type={showExportPassword ? 'text' : 'password'}
                          value={exportPassword}
                          onChange={(e) => setExportPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="w-full bg-[#101117] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowExportPassword(!showExportPassword)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                        >
                          {showExportPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Confirme a Senha *
                      </label>
                      <input
                        id="input-export-password-confirm"
                        type={showExportPassword ? 'text' : 'password'}
                        value={exportPasswordConfirm}
                        onChange={(e) => setExportPasswordConfirm(e.target.value)}
                        placeholder="Repita a senha"
                        className="w-full bg-[#101117] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-white/5 p-2.5 rounded-xl">
                    <Info size={14} className="text-emerald-400 shrink-0" />
                    <span>
                      Guarde sua senha em um gerenciador seguro. A criptografia AES-256 é irreversível sem a senha correta.
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {exportError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                    <AlertTriangle size={15} className="shrink-0" />
                    <span>{exportError}</span>
                  </div>
                )}

                {/* Success Banner */}
                {exportSuccessMessage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                    <CheckCircle2 size={15} className="shrink-0" />
                    <span>{exportSuccessMessage}</span>
                  </div>
                )}

                {/* Action Button */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 transition cursor-pointer"
                  >
                    Fechar
                  </button>
                  <button
                    id="btn-trigger-encrypted-backup"
                    type="submit"
                    disabled={isExporting}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Criptografando Dados...</span>
                      </>
                    ) : (
                      <>
                        <Download size={14} />
                        <span>Disparar Backup e Baixar JSON Criptografado</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: RESTORE / INSPECT */}
          {activeTab === 'restore' && (
            <div className="space-y-6">
              {/* Uploader Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition ${
                  uploadedFile
                    ? 'border-blue-500/50 bg-blue-500/[0.04]'
                    : 'border-white/10 hover:border-blue-500/40 bg-[#161720]'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.tfbackup"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3">
                  <FileJson size={24} />
                </div>
                {uploadedFile ? (
                  <div>
                    <p className="text-xs font-bold text-white flex items-center justify-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-400" />
                      {uploadedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {(uploadedFile.size / 1024).toFixed(1)} KB • Clique para escolher outro arquivo
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-white">
                      Selecione ou arraste o arquivo de backup (.json)
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Arquivos criptografados com padrão Troca Fácil PRO
                    </p>
                  </div>
                )}
              </div>

              {/* Senha para descriptografar */}
              {uploadedFile && !decryptedResult && (
                <form onSubmit={handleDecryptFile} className="space-y-4">
                  <div className="bg-[#181924] border border-white/10 rounded-2xl p-4.5 space-y-3">
                    <label className="block text-xs font-bold text-white">
                      Senha do Arquivo de Backup *
                    </label>
                    <div className="relative">
                      <input
                        id="input-restore-password"
                        type={showRestorePassword ? 'text' : 'password'}
                        value={restorePassword}
                        onChange={(e) => setRestorePassword(e.target.value)}
                        placeholder="Digite a senha que protege este backup"
                        className="w-full bg-[#101117] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRestorePassword(!showRestorePassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                      >
                        {showRestorePassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    <button
                      id="btn-decrypt-backup"
                      type="submit"
                      disabled={isDecrypting}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {isDecrypting ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>Descriptografando e Verificando Chaves AES...</span>
                        </>
                      ) : (
                        <>
                          <Key size={14} />
                          <span>Descriptografar & Inspecionar Conteúdo</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* Decrypted Content Preview & Confirm Restore */}
              {decryptedResult && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-[#161724] border border-emerald-500/30 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <ShieldCheck size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                            Backup Autenticado com Sucesso
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            Gerado em: {new Date(decryptedResult.createdAt).toLocaleString('pt-BR')} • Autor: {decryptedResult.metadata.geradoPor || 'Admin'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-bold">
                        Integridade 100% OK
                      </span>
                    </div>

                    {/* Resumo dos registros a serem restaurados */}
                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                      <div className="bg-[#101117] p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Veículos</span>
                        <p className="text-lg font-black text-white mt-0.5">{decryptedResult.data.veiculos?.length || 0}</p>
                      </div>
                      <div className="bg-[#101117] p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Vendas</span>
                        <p className="text-lg font-black text-emerald-400 mt-0.5">{decryptedResult.data.vendas?.length || 0}</p>
                      </div>
                      <div className="bg-[#101117] p-3 rounded-xl border border-white/5">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase">Despesas Fixas</span>
                        <p className="text-lg font-black text-amber-400 mt-0.5">{decryptedResult.data.despesasFixas?.length || 0}</p>
                      </div>
                    </div>

                    {/* Modo de Restauração */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <label className="block text-xs font-bold text-slate-300">
                        Modo de Aplicação no Sistema:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setRestoreMode('replace')}
                          className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                            restoreMode === 'replace'
                              ? 'bg-blue-600/15 border-blue-500/50 text-white'
                              : 'bg-white/5 border-white/5 text-slate-400'
                          }`}
                        >
                          <p className="text-xs font-bold">Substituição Total (Recomendado)</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Substitui a base atual pelo estado exato contido neste backup
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => setRestoreMode('merge')}
                          className={`p-3 rounded-xl text-left border transition cursor-pointer ${
                            restoreMode === 'merge'
                              ? 'bg-blue-600/15 border-blue-500/50 text-white'
                              : 'bg-white/5 border-white/5 text-slate-400'
                          }`}
                        >
                          <p className="text-xs font-bold">Mesclar Registros</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Adiciona e atualiza registros sem apagar itens não presentes no backup
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Botão de restauração */}
                    <div className="pt-2">
                      <button
                        id="btn-apply-restore-backup"
                        type="button"
                        onClick={handleConfirmRestore}
                        disabled={isRestoringData}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition cursor-pointer disabled:opacity-50"
                      >
                        {isRestoringData ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Gravando Dados no Firestore...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            <span>Restaurar Base de Dados Agora</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {restoreError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              {/* Success Banner */}
              {restoreSuccessMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{restoreSuccessMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SECURITY POLICIES */}
          {activeTab === 'policies' && (
            <div className="space-y-4">
              <div className="bg-[#161722] border border-white/5 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center gap-2 text-purple-400">
                  <ShieldCheck size={18} />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Política de Continuidade & Segurança da Informação (LGPD)
                  </h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Para proteger os dados reais de estoque, compradores e histórico financeiro contra imprevistos, recomendamos adotar o protocolo de segurança da revenda:
                </p>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-start gap-2.5 bg-[#0e0f14] p-3 rounded-xl border border-white/5">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Regra de Backup 3-2-1</p>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        Mantenha 3 cópias dos dados (1 na Nuvem Firestore em tempo real, 1 arquivo criptografado localmente e 1 cópia em pendrive/storage seguro off-site).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-[#0e0f14] p-3 rounded-xl border border-white/5">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      2
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Criptografia Forte com Chave Única</p>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        Cada arquivo exportado contém vetor de inicialização (IV) e Salt aleatórios. Sem a senha mestre definida no momento da exportação, o arquivo é ilegível para terceiros.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-[#0e0f14] p-3 rounded-xl border border-white/5">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                      3
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Periodicidade Recomendada</p>
                      <p className="text-[11px] text-slate-400 leading-tight">
                        Recomenda-se disparar o backup de segurança sempre ao fechar o mês contábil ou antes de grandes alterações em lote no estoque.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#14151c] border-t border-white/5 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1.5 font-medium">
            <Lock size={13} className="text-emerald-400" />
            Criptografia local direta no navegador (Zero-Knowledge)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold transition cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
