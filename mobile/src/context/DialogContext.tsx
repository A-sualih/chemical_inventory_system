import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type AlertOpts = {
  title: string;
  message?: string;
};

type ConfirmOpts = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type DialogState =
  | null
  | ({ kind: 'alert' } & AlertOpts & { resolve: () => void })
  | ({ kind: 'confirm' } & ConfirmOpts & { resolve: (ok: boolean) => void });

type DialogApi = {
  alert: (title: string, message?: string) => Promise<void>;
  confirm: (opts: ConfirmOpts) => Promise<boolean>;
};

const DialogContext = createContext<DialogApi | null>(null);

/** Web-safe dialogs — Alert.alert is unreliable on React Native Web. */
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(null);

  const alert = useCallback((title: string, message?: string) => {
    return new Promise<void>((resolve) => {
      setState({ kind: 'alert', title, message, resolve });
    });
  }, []);

  const confirm = useCallback((opts: ConfirmOpts) => {
    return new Promise<boolean>((resolve) => {
      setState({ kind: 'confirm', ...opts, resolve });
    });
  }, []);

  const api = useMemo(() => ({ alert, confirm }), [alert, confirm]);

  const closeAlert = () => {
    if (state?.kind !== 'alert') return;
    const { resolve } = state;
    setState(null);
    resolve();
  };

  const closeConfirm = (ok: boolean) => {
    if (state?.kind !== 'confirm') return;
    const { resolve } = state;
    setState(null);
    resolve(ok);
  };

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        visible={!!state}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (state?.kind === 'alert') closeAlert();
          else if (state?.kind === 'confirm') closeConfirm(false);
        }}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>{state?.title}</Text>
            {state?.message ? <Text style={styles.message}>{state.message}</Text> : null}

            {state?.kind === 'alert' ? (
              <View style={styles.actions}>
                <Pressable style={styles.okBtn} onPress={closeAlert}>
                  <Text style={styles.okText}>OK</Text>
                </Pressable>
              </View>
            ) : null}

            {state?.kind === 'confirm' ? (
              <View style={styles.actions}>
                <Pressable style={styles.cancelBtn} onPress={() => closeConfirm(false)}>
                  <Text style={styles.cancelText}>{state.cancelLabel || 'Cancel'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.confirmBtn, state.danger === false && styles.confirmSafe]}
                  onPress={() => closeConfirm(true)}
                >
                  <Text style={styles.confirmText}>{state.confirmLabel || 'Confirm'}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1f2937',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 17,
    marginBottom: 8,
  },
  message: {
    color: '#e5e7eb',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    backgroundColor: '#374151',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  confirmBtn: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  confirmSafe: { backgroundColor: '#0d9488' },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  okBtn: {
    backgroundColor: '#0d9488',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  okText: { color: '#fff', fontWeight: '800', fontSize: 13 },
});
