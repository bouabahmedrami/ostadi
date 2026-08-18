"use client";
import { useState, useCallback, useRef } from "react";
import { useToast } from "@/components/Toast";
import { haptic } from "./haptics";

/**
 * Actions optimistes.
 *
 * ═══════════════════════════════════════════════════════════
 * Sur une connexion algérienne, un aller-retour Firestore prend
 * entre 300 ms et 2 secondes. Pendant ce temps, l'interface ne
 * bouge pas — et l'utilisateur appuie une deuxième fois, croyant
 * que le premier appui n'a pas marché.
 *
 * L'action optimiste inverse l'ordre : l'écran change tout de
 * suite, le réseau suit. Si l'appel échoue, on revient en arrière
 * et on le dit. Dans 98 % des cas il réussit, et l'application
 * paraît instantanée.
 *
 * C'est le seul écart qui compte vraiment entre une application
 * qui semble rapide et une qui semble cassée.
 * ═══════════════════════════════════════════════════════════
 */

interface Options<T> {
  /** État affiché immédiatement, avant la réponse du serveur */
  optimistic: T;
  /** L'appel réseau */
  commit: () => Promise<any>;
  /** Message affiché en cas d'échec */
  errorMessage?: string;
  /** Message affiché en cas de succès — souvent inutile */
  successMessage?: string;
  onSuccess?: () => void;
  onError?: (err: any) => void;
}

export function useOptimistic<T>(initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [pending, setPending] = useState(false);
  const toast = useToast();

  // Mémorise l'état d'avant pour pouvoir revenir en arrière
  const previous = useRef<T>(initial);

  const run = useCallback(async (opts: Options<T>) => {
    previous.current = value;

    // 1. L'écran change immédiatement
    setValue(opts.optimistic);
    setPending(true);
    haptic("tap");

    try {
      // 2. Le réseau suit
      await opts.commit();

      if (opts.successMessage) toast.success(opts.successMessage);
      else haptic("success");

      opts.onSuccess?.();
    } catch (err) {
      // 3. Échec : on revient à l'état précédent.
      //    Sans ce retour, l'utilisateur croirait son action
      //    enregistrée alors qu'elle ne l'est pas — bien pire
      //    qu'une attente.
      setValue(previous.current);
      console.error("Action optimiste échouée :", err);
      toast.error(opts.errorMessage || "L'action n'a pas abouti.");
      opts.onError?.(err);
    } finally {
      setPending(false);
    }
  }, [value, toast]);

  return { value, setValue, pending, run };
}


/**
 * Variante pour une liste — quand on modifie un élément parmi
 * plusieurs. Le cas typique : cocher « payé » sur un élève dans
 * une liste de vingt.
 */
export function useOptimisticList<T extends { id: string }>(initial: T[]) {
  const [items, setItems] = useState<T[]>(initial);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const toast = useToast();

  const update = useCallback(async (
    id: string,
    patch: Partial<T>,
    commit: () => Promise<any>,
    errorMessage?: string
  ) => {
    const snapshot = items;

    setItems(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
    setPendingIds(prev => new Set(prev).add(id));
    haptic("tap");

    try {
      await commit();
      haptic("success");
    } catch (err) {
      setItems(snapshot);
      console.error("Mise à jour échouée :", err);
      toast.error(errorMessage || "La modification n'a pas été enregistrée.");
    } finally {
      setPendingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [items, toast]);

  const remove = useCallback(async (
    id: string,
    commit: () => Promise<any>,
    errorMessage?: string
  ) => {
    const snapshot = items;
    setItems(prev => prev.filter(i => i.id !== id));
    haptic("tap");

    try {
      await commit();
    } catch (err) {
      setItems(snapshot);
      console.error("Suppression échouée :", err);
      toast.error(errorMessage || "La suppression n'a pas abouti.");
    }
  }, [items, toast]);

  return {
    items,
    setItems,
    update,
    remove,
    isPending: (id: string) => pendingIds.has(id),
  };
}


/**
 * Confirmation sans window.confirm().
 *
 * Retourne une promesse résolue par le choix de l'utilisateur,
 * ce qui permet d'écrire :
 *
 *   if (await confirm("Supprimer ce cours ?")) { ... }
 *
 * exactement comme avec window.confirm, mais dans une feuille
 * qui ressemble au reste de l'application.
 */
export function useConfirm() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    message?: string;
    danger?: boolean;
    resolve?: (ok: boolean) => void;
  }>({ open: false, title: "" });

  const confirm = useCallback((
    title: string,
    opts: { message?: string; danger?: boolean } = {}
  ): Promise<boolean> => {
    haptic("warning");
    return new Promise(resolve => {
      setState({ open: true, title, ...opts, resolve });
    });
  }, []);

  const answer = useCallback((ok: boolean) => {
    haptic(ok ? "select" : "tap");
    state.resolve?.(ok);
    setState(s => ({ ...s, open: false }));
  }, [state]);

  return { confirm, confirmState: state, answerConfirm: answer };
}
