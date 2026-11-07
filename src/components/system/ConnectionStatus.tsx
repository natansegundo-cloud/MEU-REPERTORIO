import { Wifi, WifiOff } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

import styles from './ConnectionStatus.module.css';

export function ConnectionStatus() {
  const isOnline = useOnlineStatus();

  return (
    <span className={styles.status} role="status" aria-live="polite">
      {isOnline ? (
        <Wifi size={15} strokeWidth={1.8} aria-hidden="true" />
      ) : (
        <WifiOff size={15} strokeWidth={1.8} aria-hidden="true" />
      )}
      <Badge tone={isOnline ? 'success' : 'warning'}>{isOnline ? 'Online' : 'Offline'}</Badge>
    </span>
  );
}
