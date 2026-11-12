import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/preferences', () => ({
  getPreference: vi.fn().mockResolvedValue(0),
  setPreference: vi.fn().mockResolvedValue(undefined),
}));

import { ChordDiagram } from './ChordDiagram';

describe('ChordDiagram', () => {
  it('mostra acorde, posição e variação e permite navegar entre posições', async () => {
    const user = userEvent.setup();
    render(<ChordDiagram symbol="C" />);

    expect(screen.getByRole('img', { name: 'Diagrama de C' })).toBeInTheDocument();
    expect(screen.getByText('Posição aberta')).toBeInTheDocument();
    expect(screen.getByText(/Variação 1 de/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Próxima variação' }));

    expect(screen.getByText(/Variação 2 de/)).toBeInTheDocument();
  });

  it('distingue casa inicial, pestana e quantidade de dedos', () => {
    render(<ChordDiagram symbol="F" />);

    expect(screen.getByText('Casa 1')).toBeInTheDocument();
    expect(screen.getByText('Pestana · 4 dedos')).toBeInTheDocument();
  });

  it('não inventa posição para acorde não conhecido', () => {
    render(<ChordDiagram symbol="H" />);

    expect(screen.getByText('Sem posição confiável')).toBeInTheDocument();
    expect(screen.getByText(/não há uma posição confiável/i)).toBeInTheDocument();
  });
});
