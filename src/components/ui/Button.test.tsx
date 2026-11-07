import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('usa type button por padrão', () => {
    render(<Button>Salvar</Button>);

    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'button');
  });

  it('expõe variante e tamanho como atributos de estilo', () => {
    render(
      <Button variant="secondary" size="sm">
        Cancelar
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Cancelar' });

    expect(button).toHaveAttribute('data-variant', 'secondary');
    expect(button).toHaveAttribute('data-size', 'sm');
  });
});
