import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AuraModal } from './AuraModal';

const ModalHarness = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open review dialog
      </button>
      <AuraModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Review Action"
        footer={<button type="button">Confirm action</button>}
      >
        <button type="button">First modal action</button>
      </AuraModal>
    </div>
  );
};

describe('AuraModal', () => {
  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
  });

  it('exposes modal structure markers with a non-submit close control', async () => {
    render(<ModalHarness />);

    fireEvent.click(screen.getByRole('button', { name: 'Open review dialog' }));

    const dialog = screen.getByRole('dialog', { name: 'Review Action' });
    const closeButton = screen.getByRole('button', { name: 'Close modal' });
    const root = dialog.closest('[data-ui="modal-root"]');

    expect(root).toBeTruthy();
    expect(root?.getAttribute('data-slot')).toBe('modal-root');
    expect(dialog.getAttribute('data-ui')).toBe('modal-dialog');
    expect(dialog.getAttribute('data-slot')).toBe('modal-dialog');
    expect(dialog.getAttribute('data-size')).toBe('md');
    expect(root?.querySelector('[data-ui="modal-backdrop"]')?.getAttribute('data-slot')).toBe('modal-backdrop');
    expect(root?.querySelector('[data-ui="modal-backdrop"]')?.getAttribute('aria-hidden')).toBe('true');
    expect(root?.querySelector('[data-ui="modal-header"]')?.getAttribute('data-slot')).toBe('modal-header');
    expect(root?.querySelector('[data-ui="modal-body"]')?.getAttribute('data-slot')).toBe('modal-body');
    expect(root?.querySelector('[data-ui="modal-footer"]')?.getAttribute('data-slot')).toBe('modal-footer');
    expect(closeButton.getAttribute('type')).toBe('button');

    await waitFor(() => {
      expect(document.activeElement).toBe(closeButton);
    });
  });

  it('locks page scroll while open, restores the prior overflow, and returns focus on Escape', async () => {
    document.body.style.overflow = 'auto';
    render(<ModalHarness />);

    const opener = screen.getByRole('button', { name: 'Open review dialog' });
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole('dialog', { name: 'Review Action' });
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('data-ui')).toBe('modal-dialog');
    expect(dialog.getAttribute('data-slot')).toBe('modal-dialog');
    expect(document.body.style.overflow).toBe('hidden');

    await waitFor(() => {
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close modal' }));
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Review Action' })).toBeNull();
      expect(document.body.style.overflow).toBe('auto');
      expect(document.activeElement).toBe(opener);
    });
  });
});
