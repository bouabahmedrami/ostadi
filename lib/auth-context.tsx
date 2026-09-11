"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  reload,
  User,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { UserProfile, UserRole } from "@/lib/types";

// Version courante des CGU — à incrémenter si tu modifies les conditions
export const CGU_VERSION = "1.0";

/** Compte administrateur — doit correspondre aux règles Firestore */
const ADMIN_UID = "4bnssIV8FlS80SzaX6ylwc9Fbg92";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  emailVerified: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    phone: string,
    wilaya: string,
    role: UserRole
  ) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerification: () => Promise<void>;
  refreshEmailVerified: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailVerified, setEmailVerified] = useState(false);

  /**
   * Récupère le profil Firestore de l'utilisateur.
   *
   * Si le document n'existe pas, il est créé automatiquement.
   * Ce cas se produit quand un compte a été créé directement depuis
   * la console Firebase Authentication : l'utilisateur peut se connecter,
   * mais l'application n'a aucune information sur lui — pas de nom,
   * pas de rôle, donc un menu vide et aucun accès au dashboard.
   */
  const fetchProfile = async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));

      if (snap.exists()) {
        setProfile(snap.data() as UserProfile);
        return;
      }

      const u = auth.currentUser;
      if (!u) return;

      const now = new Date().toISOString();
      const isAdmin = uid === ADMIN_UID;

      /**
       * ⚠️ Rôle d'un profil recréé.
       *
       * Firebase sépare l'authentification des données : supprimer le
       * document Firestore laisse le compte Auth intact. La personne
       * se reconnecte, on arrive ici, et on lui refabrique un profil.
       *
       * Le rôle « élève » par défaut créait une boucle : un professeur
       * dont le profil avait été supprimé redevenait élève à chaque
       * reconnexion, sans moyen d'en sortir. Le commentaire d'origine
       * promettait un changement « depuis le profil » — cette option
       * n'existait pas.
       *
       * On mémorise donc le rôle voulu au moment de l'inscription,
       * dans le stockage local. Il survit à une suppression de profil
       * et disparaît de lui-même une fois utilisé.
       */
      let intendedRole: "student" | "teacher" = "student";
      try {
        const saved = localStorage.getItem("ostadi-intended-role");
        if (saved === "teacher" || saved === "student") {
          intendedRole = saved;
          localStorage.removeItem("ostadi-intended-role");
        }
      } catch { /* navigation privée */ }

      const created: UserProfile = {
        uid,
        // L'admin est aussi professeur, pour pouvoir tester la plateforme
        role: isAdmin ? "teacher" : intendedRole,
        displayName:
          u.displayName || u.email?.split("@")[0] || "Utilisateur",
        phone: u.phoneNumber || "",
        wilaya: "Alger",
        createdAt: now,
        rating: 0,
        ratingCount: 0,
        featured: false,
        subscriptionActive: isAdmin,
        diplomaVerified: isAdmin,
        cguAccepted: true,
        cguAcceptedAt: now,
        cguVersion: CGU_VERSION,
      };

      await setDoc(doc(db, "users", uid), created);
      setProfile(created);
      console.info("Profil Firestore créé automatiquement pour", uid);
    } catch (err) {
      // Non bloquant : l'utilisateur reste connecté, l'app fonctionne
      // en mode dégradé plutôt que de planter
      console.error("Chargement du profil échoué :", err);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setEmailVerified(u?.emailVerified ?? false);
      if (u) await fetchProfile(u.uid);
      else setProfile(null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    phone: string,
    wilaya: string,
    role: UserRole
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    /**
     * Mémorise le rôle voulu.
     *
     * Sert de filet si le profil Firestore venait à disparaître : la
     * recréation automatique retrouvera le bon rôle au lieu de
     * retomber sur « élève ».
     */
    try {
      localStorage.setItem("ostadi-intended-role", role);
    } catch { /* navigation privée */ }

    const now = new Date().toISOString();
    const profileData: UserProfile = {
      uid: cred.user.uid,
      role,
      displayName: name,
      phone,
      wilaya,
      rating: 0,
      ratingCount: 0,
      featured: false,
      subscriptionActive: false,
      diplomaVerified: false,
      createdAt: now,
      // ── Traçabilité de l'acceptation des CGU ──
      cguAccepted: true,
      cguAcceptedAt: now,
      cguVersion: CGU_VERSION,
    };
    await setDoc(doc(db, "users", cred.user.uid), profileData);
    setProfile(profileData);

    // ── Envoi de l'email de vérification ──
    // On n'échoue pas l'inscription si l'envoi rate (quota, réseau...)
    try {
      await sendEmailVerification(cred.user, {
        url: `${window.location.origin}/`,
        handleCodeInApp: false,
      });
    } catch (e) {
      console.warn("Email de vérification non envoyé :", e);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setEmailVerified(false);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  // ── Réinitialisation du mot de passe ──
  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/auth`,
      handleCodeInApp: false,
    });
  };

  // ── Renvoi de l'email de vérification ──
  const sendVerification = async () => {
    if (!auth.currentUser) throw new Error("no-user");
    await sendEmailVerification(auth.currentUser, {
      url: `${window.location.origin}/`,
      handleCodeInApp: false,
    });
  };

  // ── Recharge l'utilisateur pour détecter une vérification récente ──
  const refreshEmailVerified = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const verified = auth.currentUser.emailVerified;
    setEmailVerified(verified);
    return verified;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        emailVerified,
        login,
        register,
        logout,
        refreshProfile,
        resetPassword,
        sendVerification,
        refreshEmailVerified,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
