"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { Notification, type NotificationType } from "@/components/Notification";

interface NotifyOptions {
  type?: NotificationType;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
}

interface ConfirmOptions {
  type?: NotificationType;
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmTone?: "primary" | "danger";
}

interface NotificationContextValue {
  /** Muestra un aviso (un solo botón). */
  notify: (opts: NotifyOptions) => void;
  /** Muestra una confirmación; resuelve `true` si el usuario confirma. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

type State =
  | { kind: "notify"; opts: NotifyOptions }
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | null;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(null);

  const notify = useCallback((opts: NotifyOptions) => {
    setState({ kind: "notify", opts });
  }, []);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ kind: "confirm", opts, resolve });
    });
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({ notify, confirm }),
    [notify, confirm],
  );

  const close = useCallback(() => setState(null), []);

  let modal: ReactNode = null;
  if (state?.kind === "notify") {
    modal = (
      <Notification
        type={state.opts.type ?? "info"}
        title={state.opts.title}
        message={state.opts.message}
        confirmLabel={state.opts.confirmLabel ?? "Ok"}
        onConfirm={close}
      />
    );
  } else if (state?.kind === "confirm") {
    const finish = (result: boolean) => {
      state.resolve(result);
      close();
    };
    modal = (
      <Notification
        type={state.opts.type ?? "warning"}
        title={state.opts.title}
        message={state.opts.message}
        confirmLabel={state.opts.confirmLabel ?? "Confirmar"}
        cancelLabel={state.opts.cancelLabel ?? "Cancelar"}
        confirmTone={state.opts.confirmTone ?? "primary"}
        onConfirm={() => finish(true)}
        onCancel={() => finish(false)}
      />
    );
  }

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {modal}
    </NotificationContext.Provider>
  );
}

export function useNotification(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotification debe usarse dentro de NotificationProvider");
  }
  return ctx;
}
