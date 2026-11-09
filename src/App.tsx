/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppSettings } from './types';
import { loadSettings, saveSettings } from './utils/storage';
import { HomeScreen } from './components/HomeScreen';
import { SettingsScreen } from './components/SettingsScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'home' | 'settings'>('home');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const handleUpdateSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-[#FBF7FF] text-[#2E1A47] antialiased">
      {currentScreen === 'home' ? (
        <HomeScreen
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenSettings={() => setCurrentScreen('settings')}
        />
      ) : (
        <SettingsScreen
          settings={settings}
          onSave={handleUpdateSettings}
          onBack={() => setCurrentScreen('home')}
        />
      )}
    </div>
  );
}
