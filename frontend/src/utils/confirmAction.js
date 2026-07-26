import { createElement } from 'react';
import toast from 'react-hot-toast';

const TOAST_STYLE = {
  background: '#1f2937',
  border: '1px solid #374151',
  padding: '16px',
  color: '#ffffff',
  borderRadius: '12px',
  boxShadow:
    '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
  maxWidth: '420px',
};

const btnBase = {
  border: 'none',
  padding: '6px 12px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 600,
};

/**
 * Styled confirm dialog matching system logout toast.
 * @returns {Promise<boolean>}
 */
export function confirmAction({
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  duration = 12000,
}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const id = toast(
      (t) =>
        createElement(
          'div',
          {
            style: {
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minWidth: '260px',
            },
          },
          createElement(
            'p',
            {
              style: {
                margin: 0,
                fontSize: '0.875rem',
                fontWeight: 500,
                color: '#ffffff',
                lineHeight: 1.45,
              },
            },
            message
          ),
          createElement(
            'div',
            { style: { display: 'flex', gap: '8px', alignSelf: 'flex-end' } },
            createElement(
              'button',
              {
                type: 'button',
                onClick: () => {
                  toast.dismiss(t.id);
                  finish(false);
                },
                style: {
                  ...btnBase,
                  background: '#374151',
                  color: 'white',
                },
              },
              cancelLabel
            ),
            createElement(
              'button',
              {
                type: 'button',
                onClick: () => {
                  toast.dismiss(t.id);
                  finish(true);
                },
                style: {
                  ...btnBase,
                  background: danger ? '#ef4444' : '#0d9488',
                  color: 'white',
                },
              },
              confirmLabel
            )
          )
        ),
      {
        duration,
        position: 'top-center',
        style: TOAST_STYLE,
      }
    );

    setTimeout(() => {
      toast.dismiss(id);
      finish(false);
    }, duration);
  });
}

/** Info / success toast in the same dark style */
export function notifyAction(message, { success = true } = {}) {
  toast(message, {
    duration: 5000,
    position: 'top-center',
    style: {
      ...TOAST_STYLE,
      border: success ? '1px solid #059669' : '1px solid #ef4444',
    },
  });
}
