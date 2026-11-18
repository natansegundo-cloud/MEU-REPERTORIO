import { Monitor, Moon, Sun, SunMoon, type LucideIcon } from 'lucide-react';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { useAppearance } from '@/hooks/useAppearance';
import type { AppearancePreference } from '@/services';

import styles from './AppearancePanel.module.css';

interface AppearanceOption {
  readonly value: AppearancePreference;
  readonly label: string;
  readonly icon: LucideIcon;
}

const APPEARANCE_OPTIONS: readonly AppearanceOption[] = [
  { value: 'system', label: 'Sistema', icon: Monitor },
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
];

export function AppearancePanel() {
  const { preference, resolvedTheme, setPreference } = useAppearance();

  const activeSummary =
    preference === 'system'
      ? `Seguindo a preferência do dispositivo (atualmente ${
          resolvedTheme === 'dark' ? 'escuro' : 'claro'
        }).`
      : preference === 'dark'
        ? 'Tema escuro fixado neste dispositivo.'
        : 'Tema claro fixado neste dispositivo.';

  return (
    <SettingsCard
      id="appearance-title"
      icon={SunMoon}
      title="Tema"
      description="Escolha como o aplicativo é exibido neste dispositivo."
    >
      <div className={styles.segmented} role="radiogroup" aria-label="Aparência do aplicativo">
        {APPEARANCE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = preference === option.value;
          return (
            <label
              key={option.value}
              className={styles.option}
              data-active={active ? 'true' : undefined}
            >
              <input
                className={styles.input}
                type="radio"
                name="appearance-preference"
                value={option.value}
                checked={active}
                onChange={() => void setPreference(option.value)}
              />
              <span className={styles.optionContent}>
                <Icon
                  className={styles.optionIcon}
                  size={15}
                  strokeWidth={1.85}
                  aria-hidden="true"
                />
                <span>{option.label}</span>
              </span>
            </label>
          );
        })}
      </div>
      <p className={styles.summary} role="status" aria-live="polite">
        {activeSummary} O Modo Show mantém sempre a superfície escura de palco.
      </p>
    </SettingsCard>
  );
}
