let activeLocks = 0;
let previousOverflow = '';
let previousPaddingRight = '';

/**
 * Bloqueia a rolagem do documento enquanto um painel modal está aberto.
 * O bloqueio é contado para que painéis sobrepostos não restaurem o estilo cedo demais.
 */
export function lockBodyScroll(): () => void {
  const body = document.body;
  if (activeLocks === 0) {
    previousOverflow = body.style.overflow;
    previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;
  }
  activeLocks += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    activeLocks = Math.max(0, activeLocks - 1);
    if (activeLocks === 0) {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    }
  };
}
