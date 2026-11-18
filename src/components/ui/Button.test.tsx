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

  it('suporta as variantes semânticas destrutivas danger e danger-soft', () => {
    render(
      <>
        <Button variant="danger">Excluir</Button>
        <Button variant="danger-soft">Remover</Button>
      </>,
    );

    expect(screen.getByRole('button', { name: 'Excluir' })).toHaveAttribute(
      'data-variant',
      'danger',
    );
    expect(screen.getByRole('button', { name: 'Remover' })).toHaveAttribute(
      'data-variant',
      'danger-soft',
    );
  });
});
