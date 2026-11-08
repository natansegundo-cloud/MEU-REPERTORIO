import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { NAVIGATION_ITEMS, type SectionId } from '@/app/navigation';

import styles from './MobileNavMenu.module.css';

interface MobileNavMenuProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}

export function MobileNavMenu({ activeSection, onSectionChange }: MobileNavMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);
  const previousSectionRef = useRef(activeSection);

  useEffect(() => {
    if (previousSectionRef.current === activeSection) return;
    previousSectionRef.current = activeSection;
    setIsOpen(false);
  }, [activeSection]);

  useEffect(() => {
    if (isOpen) {
      wasOpenRef.current = true;
      firstItemRef.current?.focus();
      return;
    }

    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      menuButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setIsOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  function handleSectionChange(section: SectionId): void {
    onSectionChange(section);
    setIsOpen(false);
  }

  return (
    <div className={styles.mobileNav}>
      <button
        ref={menuButtonRef}
        type="button"
        className={styles.menuButton}
        aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation-menu"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? (
          <X size={21} strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <Menu size={21} strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Fechar menu ao tocar fora"
            onClick={() => setIsOpen(false)}
          />
          <nav id="mobile-navigation-menu" className={styles.menu} aria-label="Navegação móvel">
            {NAVIGATION_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const isActive = item.id === activeSection;

              return (
                <button
                  key={item.id}
                  ref={index === 0 ? firstItemRef : undefined}
                  type="button"
                  className={styles.navItem}
                  data-mobile-nav-item
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => handleSectionChange(item.id)}
                >
                  <Icon className={styles.navIcon} size={19} strokeWidth={1.8} aria-hidden="true" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </>
      ) : null}
    </div>
  );
}
