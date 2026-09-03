import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { Usuario, RoleUsuario, StatusAprovacao, PermissoesUsuario } from '../types';

export const USERS_COLLECTION = 'users';

// Helper to strip undefined values so Firestore setDoc never throws an 'unsupported field value: undefined' error
function cleanFirestoreData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// Admin master email for automatic approval & full permissions
export const MASTER_ADMIN_EMAIL = 'gustavohenriquee1a@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Returns default granular permissions based on role
 */
export function getDefaultPermissionsForRole(role: RoleUsuario): PermissoesUsuario {
  switch (role) {
    case 'admin':
      return {
        // Vendas & Estoque
        verPainelExecutivo: true,
        verDashboardExecutivo: true,
        verVendedorDash: true,
        verCatalogo: true,
        verComissoes: true,
        verEstoque: true,
        verLogistica: true,
        verRevisoes: true,
        verFornecedores: true,
        verBancos: true,
        verAging: true,
        verCrmAnalytics: true,
        verFinanceiroDRE: true,

        // Locação
        verLocacaoContratos: true,
        verLocacaoKm: true,
        verLocacaoManutencao: true,
        verLocacaoDebitos: true,
        verLocacaoCaucao: true,

        // Administração
        gerenciarUsuarios: true,
        verBackupSeguranca: true,

        // Operações & Sigilo
        venderCarro: true,
        verCustosAquisicao: true,
        gerenciarLocacao: true,
        gerenciarRevisoes: true,
        gerenciarFornecedores: true,
        gerenciarLogistica: true,
        gerenciarBancos: true,

        // Mais Detalhes & Recursos Especiais
        podeGerarContratoVenda: true,
        podeRealizarTestDrive: true,
        podeFazerVistoria: true,
        verFunilPreparacao: true,
        gerenciarFunilPreparacao: true,
      };
    case 'gestor':
      return {
        verPainelExecutivo: true,
        verDashboardExecutivo: true,
        verVendedorDash: false,
        verCatalogo: true,
        verComissoes: true,
        verEstoque: true,
        verLogistica: true,
        verRevisoes: true,
        verFornecedores: true,
        verBancos: true,
        verAging: true,
        verCrmAnalytics: true,
        verFinanceiroDRE: true,

        verLocacaoContratos: true,
        verLocacaoKm: true,
        verLocacaoManutencao: true,
        verLocacaoDebitos: true,
        verLocacaoCaucao: true,

        gerenciarUsuarios: false,
        verBackupSeguranca: false,

        venderCarro: true,
        verCustosAquisicao: true,
        gerenciarLocacao: true,
        gerenciarRevisoes: true,
        gerenciarFornecedores: true,
        gerenciarLogistica: true,
        gerenciarBancos: true,

        podeGerarContratoVenda: true,
        podeRealizarTestDrive: true,
        podeFazerVistoria: true,
        verFunilPreparacao: true,
        gerenciarFunilPreparacao: true,
      };
    case 'vendedor':
      return {
        verPainelExecutivo: false,
        verDashboardExecutivo: false,
        verVendedorDash: true,
        verCatalogo: true,
        verComissoes: true,
        verEstoque: false,
        verLogistica: false,
        verRevisoes: false,
        verFornecedores: false,
        verBancos: false,
        verAging: false,
        verCrmAnalytics: false,
        verFinanceiroDRE: false,

        verLocacaoContratos: false,
        verLocacaoKm: false,
        verLocacaoManutencao: false,
        verLocacaoDebitos: false,
        verLocacaoCaucao: false,

        gerenciarUsuarios: false,
        verBackupSeguranca: false,

        venderCarro: true,
        verCustosAquisicao: false,
        gerenciarLocacao: false,
        gerenciarRevisoes: false,
        gerenciarFornecedores: false,
        gerenciarLogistica: false,
        gerenciarBancos: false,

        podeGerarContratoVenda: true,
        podeRealizarTestDrive: true,
        podeFazerVistoria: false,
        verFunilPreparacao: false,
        gerenciarFunilPreparacao: false,
      };
    case 'operador':
    default:
      return {
        verPainelExecutivo: false,
        verDashboardExecutivo: false,
        verVendedorDash: false,
        verCatalogo: true,
        verComissoes: false,
        verEstoque: true,
        verLogistica: true,
        verRevisoes: true,
        verFornecedores: true,
        verBancos: false,
        verAging: false,
        verCrmAnalytics: false,
        verFinanceiroDRE: false,

        verLocacaoContratos: true,
        verLocacaoKm: true,
        verLocacaoManutencao: true,
        verLocacaoDebitos: true,
        verLocacaoCaucao: true,

        gerenciarUsuarios: false,
        verBackupSeguranca: false,

        venderCarro: false,
        verCustosAquisicao: false,
        gerenciarLocacao: true,
        gerenciarRevisoes: true,
        gerenciarFornecedores: true,
        gerenciarLogistica: true,
        gerenciarBancos: false,

        podeGerarContratoVenda: false,
        podeRealizarTestDrive: false,
        podeFazerVistoria: true,
        verFunilPreparacao: true,
        gerenciarFunilPreparacao: true,
      };
  }
}

/**
 * Perform Google Sign-in via Firebase Auth popup
 * NOTE: Non-admin users are ALWAYS created with statusAprovacao='pendente'
 * and require explicit approval by the administrator in UsuariosModal.
 */
export async function loginWithGoogle(): Promise<Usuario> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    const userProfile = await syncUserProfileInFirestore(fbUser, { authProvider: 'google' });
    return userProfile;
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('O navegador bloqueou a janela pop-up do Google. Por favor, autorize pop-ups para este site ou utilize o cadastro direto com E-mail e Senha.');
    }
    if (error?.code === 'auth/unauthorized-domain') {
      throw new Error('Domínio compartilhado não listado no Google Auth. Utilize a opção de cadastro com E-mail e Senha abaixo.');
    }
    if (error?.code === 'auth/cancelled-popup-request' || error?.code === 'auth/popup-closed-by-user') {
      throw new Error('Autenticação com o Google cancelada.');
    }
    throw new Error(error?.message || 'Falha ao autenticar com o Google. Tente entrar com E-mail e Senha.');
  }
}

/**
 * Register a new user with Email and Password
 */
export async function registerWithEmail(
  nome: string,
  email: string,
  pass: string,
  desiredRole: RoleUsuario = 'vendedor',
  telefone: string = ''
): Promise<Usuario> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = cred.user;
    
    if (nome) {
      await updateProfile(fbUser, { displayName: nome });
    }

    const profile = await syncUserProfileInFirestore(fbUser, {
      displayName: nome,
      role: desiredRole,
      cargo: desiredRole === 'vendedor' ? 'Vendedor de Estoque' : desiredRole === 'gestor' ? 'Gerente de Pátio' : 'Operador de Frota',
      telefone,
      authProvider: 'password',
    });

    return profile;
  } catch (error: any) {
    console.error('Email registration error:', error);
    if (error?.code === 'auth/email-already-in-use') {
      throw new Error('Este e-mail já está cadastrado. Faça login ou use outro e-mail.');
    }
    if (error?.code === 'auth/weak-password') {
      throw new Error('A senha deve ter pelo menos 6 caracteres.');
    }
    if (error?.code === 'auth/invalid-email') {
      throw new Error('E-mail inválido. Verifique o formato digitado.');
    }
    throw new Error(error?.message || 'Falha ao realizar cadastro.');
  }
}

/**
 * Login with Email and Password
 */
export async function loginWithEmail(email: string, pass: string): Promise<Usuario> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const profile = await syncUserProfileInFirestore(cred.user, { authProvider: 'password' });
    return profile;
  } catch (error: any) {
    console.error('Email login error:', error);
    if (error?.code === 'auth/user-not-found' || error?.code === 'auth/wrong-password' || error?.code === 'auth/invalid-credential') {
      throw new Error('E-mail ou senha incorretos.');
    }
    if (error?.code === 'auth/invalid-email') {
      throw new Error('E-mail inválido.');
    }
    throw new Error(error?.message || 'Falha ao fazer login.');
  }
}

/**
 * Log out from Firebase Auth
 */
export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Creates or updates the user profile document in Firestore upon login.
 * 
 * SECURITY RULE:
 * - If email === MASTER_ADMIN_EMAIL: Automatically approved as Administrator.
 * - For ALL other users (Google or Email/Password):
 *   - If the user document ALREADY exists in Firestore, maintain their current `statusAprovacao`
 *     (pendente, aprovado, or recusado) and server-assigned role/permissions.
 *   - If the user document is NEW, set `statusAprovacao = 'pendente'`, blocking system access
 *     until the administrator explicitly approves them in the UsuariosModal interface.
 */
export async function syncUserProfileInFirestore(
  fbUser: FirebaseUser,
  customInitData?: {
    displayName?: string;
    role?: RoleUsuario;
    cargo?: string;
    telefone?: string;
    authProvider?: 'google' | 'password' | 'outro';
  }
): Promise<Usuario> {
  const userDocRef = doc(db, USERS_COLLECTION, fbUser.uid);
  const now = new Date().toISOString();
  const userEmail = (fbUser.email || '').toLowerCase().trim();

  // Check if this is the Master Admin
  const isMasterAdmin = userEmail === MASTER_ADMIN_EMAIL.toLowerCase();

  try {
    const userSnap = await getDoc(userDocRef);

    if (userSnap.exists()) {
      const existingData = userSnap.data() as Usuario;
      
      // Master admin is always approved as admin.
      // Other users KEEP whatever status was established in Firestore.
      const statusAprovacao: StatusAprovacao = isMasterAdmin ? 'aprovado' : (existingData.statusAprovacao || 'pendente');
      const role: RoleUsuario = isMasterAdmin ? 'admin' : (existingData.role || 'vendedor');
      const permissoes: PermissoesUsuario = isMasterAdmin
        ? getDefaultPermissionsForRole('admin')
        : (existingData.permissoes || getDefaultPermissionsForRole(role));

      const updatedProfile: Usuario = {
        ...existingData,
        email: fbUser.email || existingData.email,
        displayName: fbUser.displayName || customInitData?.displayName || existingData.displayName || 'Membro da Equipe',
        photoURL: fbUser.photoURL || existingData.photoURL || '',
        statusAprovacao,
        role,
        permissoes,
        authProvider: existingData.authProvider || customInitData?.authProvider || (fbUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'password'),
        lastLoginAt: now,
      };

      await setDoc(userDocRef, cleanFirestoreData(updatedProfile), { merge: true });
      return updatedProfile;
    } else {
      // NEW USER: Unless it's the master admin, status is strictly 'pendente'
      const assignedRole: RoleUsuario = isMasterAdmin ? 'admin' : (customInitData?.role || 'vendedor');
      const statusAprovacao: StatusAprovacao = isMasterAdmin ? 'aprovado' : 'pendente';
      const permissoes: PermissoesUsuario = getDefaultPermissionsForRole(assignedRole);

      const newProfile: Usuario = {
        uid: fbUser.uid,
        email: fbUser.email || '',
        displayName: fbUser.displayName || customInitData?.displayName || 'Novo Usuário',
        photoURL: fbUser.photoURL || '',
        role: assignedRole,
        statusAprovacao,
        permissoes,
        comissaoPadraoPercent: assignedRole === 'vendedor' ? 1.5 : undefined,
        cargo: customInitData?.cargo || (assignedRole === 'admin' ? 'Administrador Geral' : assignedRole === 'vendedor' ? 'Vendedor de Veículos' : assignedRole === 'gestor' ? 'Gestor de Frota' : 'Operador de Pátio'),
        telefone: customInitData?.telefone || fbUser.phoneNumber || '',
        ativo: true,
        authProvider: customInitData?.authProvider || (fbUser.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'password'),
        createdAt: now,
        lastLoginAt: now,
      };

      await setDoc(userDocRef, cleanFirestoreData(newProfile));
      return newProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${USERS_COLLECTION}/${fbUser.uid}`);
    throw error;
  }
}

/**
 * Subscribe to realtime auth state changes
 */
export function listenToAuthState(
  onUserChanged: (user: FirebaseUser | null) => void
) {
  return onAuthStateChanged(auth, onUserChanged);
}

/**
 * Subscribe to a specific user profile document in Firestore
 */
export function subscribeUserProfile(
  uid: string,
  onProfileChanged: (profile: Usuario | null) => void,
  onError?: (err: Error) => void
) {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  return onSnapshot(
    userDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onProfileChanged(docSnap.data() as Usuario);
      } else {
        onProfileChanged(null);
      }
    },
    (err) => {
      console.warn('Error subscribing to user profile:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Subscribe to all users in the system (team directory & pending approvals)
 */
export function subscribeAllUsers(
  onData: (users: Usuario[]) => void,
  onError?: (err: Error) => void
) {
  const colRef = collection(db, USERS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: Usuario[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as Usuario);
      });
      // Sort by status (pendente first) then recent login
      list.sort((a, b) => {
        if (a.statusAprovacao === 'pendente' && b.statusAprovacao !== 'pendente') return -1;
        if (b.statusAprovacao === 'pendente' && a.statusAprovacao !== 'pendente') return 1;
        return new Date(b.lastLoginAt || b.createdAt || 0).getTime() - new Date(a.lastLoginAt || a.createdAt || 0).getTime();
      });
      onData(list);
    },
    (err) => {
      console.warn('Error subscribing to users collection:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Explicitly approve a pending user in Firestore and define their role, permissions, and commission rate
 */
export async function approveUserInFirestore(
  uid: string,
  role: RoleUsuario,
  customPermissoes?: Partial<PermissoesUsuario>,
  comissaoPadraoPercent?: number,
  adminEmail?: string,
  tipoComissaoPadrao?: 'percentual' | 'fixo' | 'admin_gerente' | 'vendedor_padrao' | 'vendedor_bonus_tac' | 'percentual_venda',
  comissaoPadraoFixo?: number,
  regraComissaoPadrao?: 'admin_gerente' | 'vendedor_padrao' | 'vendedor_bonus_tac' | 'percentual_venda' | 'percentual' | 'fixo',
  comissaoBonusTacPercent?: number
): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  const basePerms = getDefaultPermissionsForRole(role);
  const finalPermissoes: PermissoesUsuario = {
    ...basePerms,
    ...(customPermissoes || {}),
  };

  const updates: Partial<Usuario> = {
    statusAprovacao: 'aprovado',
    role,
    permissoes: finalPermissoes,
    ativo: true,
    dataAprovacao: new Date().toISOString(),
    ...(adminEmail ? { aprovadoPor: adminEmail } : {}),
    ...(regraComissaoPadrao ? { regraComissaoPadrao } : {}),
    ...(tipoComissaoPadrao !== undefined ? { tipoComissaoPadrao } : {}),
    ...(comissaoPadraoPercent !== undefined ? { comissaoPadraoPercent } : {}),
    ...(comissaoPadraoFixo !== undefined ? { comissaoPadraoFixo } : {}),
    ...(comissaoBonusTacPercent !== undefined ? { comissaoBonusTacPercent } : {}),
  };

  try {
    await setDoc(userDocRef, cleanFirestoreData(updates), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
}

/**
 * Reject or block a user in Firestore
 */
export async function rejectUserInFirestore(uid: string, motivo?: string): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  try {
    await setDoc(
      userDocRef,
      cleanFirestoreData({
        statusAprovacao: 'recusado',
        ativo: false,
        ...(motivo ? { motivoRecusa: motivo } : {}),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
}

/**
 * Revoke approval and return user to pending state
 */
export async function revokeUserApprovalInFirestore(uid: string): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  try {
    await setDoc(
      userDocRef,
      cleanFirestoreData({
        statusAprovacao: 'pendente',
        ativo: true,
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
}

/**
 * Update user permissions, role, commission and status in Firestore
 */
export async function updateUserPermissionsInFirestore(
  uid: string,
  updates: {
    role?: RoleUsuario;
    permissoes?: PermissoesUsuario;
    regraComissaoPadrao?: 'admin_gerente' | 'vendedor_padrao' | 'vendedor_bonus_tac' | 'percentual_venda' | 'percentual' | 'fixo';
    tipoComissaoPadrao?: 'percentual' | 'fixo' | 'admin_gerente' | 'vendedor_padrao' | 'vendedor_bonus_tac' | 'percentual_venda';
    comissaoPadraoPercent?: number;
    comissaoPadraoFixo?: number;
    comissaoBonusTacPercent?: number;
    cargo?: string;
    telefone?: string;
    ativo?: boolean;
    statusAprovacao?: StatusAprovacao;
  }
): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  try {
    await setDoc(userDocRef, cleanFirestoreData(updates), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
  }
}

/**
 * Delete a user profile completely from Firestore
 */
export async function deleteUserInFirestore(uid: string): Promise<void> {
  const userDocRef = doc(db, USERS_COLLECTION, uid);
  try {
    await deleteDoc(userDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${USERS_COLLECTION}/${uid}`);
  }
}
