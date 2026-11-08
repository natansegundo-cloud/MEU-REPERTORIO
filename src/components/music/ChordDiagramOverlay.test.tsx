import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/preferences', () => ({
  getPreference: vi.fn().mockResolvedValue(0),
  setPreference: vi.fn().mockResolvedValue(undefined),
}));

import { ChordDiagramOverlay } from './ChordDiagramOverlay';

describe('ChordDiagramOverlay', () => {
  it('abre com foco no fechamento, fecha por Escape e devolve o foco ao acorde', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <>
        <button type="button">Acorde C</button>
        <ChordDiagramOverlay symbol="C" onClose={onClose} />
      </>,
    );

    const closeButton = screen.getByRole('button', { name: 'Fechar diagrama' });
    expect(closeButton).toHaveFocus();
    expect(screen.getByRole('dialog', { name: 'Diagrama de acorde C' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('fecha ao tocar fora do painel', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ChordDiagramOverlay symbol="G" onClose={onClose} />);

    await user.click(document.body);

    expect(onClose).toHaveBeenCalled();
  });
});
