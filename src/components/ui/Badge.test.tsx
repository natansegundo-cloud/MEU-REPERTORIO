import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Badge } from './Badge';

describe('Badge', () => {
  it('usa tom neutral por padrão', () => {
    render(<Badge>Padrão</Badge>);

    expect(screen.getByText('Padrão')).toHaveAttribute('data-tone', 'neutral');
  });

  it('suporta todos os tons semânticos incluindo danger', () => {
    render(
      <>
        <Badge tone="accent">Destaque</Badge>
        <Badge tone="success">Online</Badge>
        <Badge tone="warning">Offline</Badge>
        <Badge tone="danger">Erro</Badge>
      </>,
    );

    expect(screen.getByText('Destaque')).toHaveAttribute('data-tone', 'accent');
    expect(screen.getByText('Online')).toHaveAttribute('data-tone', 'success');
    expect(screen.getByText('Offline')).toHaveAttribute('data-tone', 'warning');
    expect(screen.getByText('Erro')).toHaveAttribute('data-tone', 'danger');
  });
});
