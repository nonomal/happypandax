import {
  auto as followSystemColorScheme,
  disable as disableDarkMode,
  enable as enableDarkMode,
} from 'darkreader';
import React, { useEffect } from 'react';
import { useRecoilValue } from 'recoil';

import { AppState } from '../state';

export default function Theme({
  name,
  children,
}: {
  name?: 'light' | 'dark';
  children: React.ReactNode | React.ReactNode[];
}) {
  const theme = useRecoilValue(AppState.theme);
  const themeName = name ?? theme;

  useEffect(() => {
    const darkProps = {
      brightness: 100,
      contrast: 70,
      sepia: 5,
    };

    if (themeName) {
      followSystemColorScheme(false);
      if (themeName === 'dark') {
        enableDarkMode(darkProps);
      } else {
        disableDarkMode();
      }
    } else {
      // followSystemColorScheme(darkProps);
    }
  }, [themeName]);

  return <>{children}</>;
}