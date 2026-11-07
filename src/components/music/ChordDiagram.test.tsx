import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/preferences', () => ({
  getPreference: vi.fn().mockResolvedValue(0),
  setPreference: vi.fn().mockResolvedValue(undefined),
}));

import { ChordDiagram } from './ChordDiagram';

describe('ChordDiagram', () => {
  it('renderiza uma posição conhecida e permite navegar por variações', () => {
    render(<ChordDiagram symbol="C" />);

    expect(screen.getByRole('img', { name: /Posição 1 de/ })).toBeInTheDocument();
    expect(screen.getByText(/Variação 1 de/)).toBeInTheDocument();
  });

  it('não inventa posição para acorde não conhecido', () => {
    render(<ChordDiagram symbol="H" />);

    expect(screen.getByText(/não há uma posição conhecida/i)).toBeInTheDocument();
  });
});
