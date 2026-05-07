import React, { useState, useCallback } from 'react';
import { OrbitalToggle, type OrbitalToggleProps } from '@lupine/ui';
import { ToggleSpark } from './ToggleSpark';

export const AnimatedOrbitalToggle: React.FC<OrbitalToggleProps> = ({
  label,
  active,
  onClick,
  hint,
}) => {
  const [fire, setFire] = useState(false);

  const handleClick = useCallback(() => {
    setFire(true);
    setTimeout(() => setFire(false), 50);
    onClick();
  }, [onClick]);

  return (
    <div style={{ position: 'relative' }}>
      <OrbitalToggle label={label} active={active} onClick={handleClick} hint={hint} />
      <ToggleSpark fire={fire} on={!active} />
    </div>
  );
};
