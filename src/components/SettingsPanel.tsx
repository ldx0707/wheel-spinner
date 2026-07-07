import { t } from '../i18n';
import type { WheelSettings } from '../types';

interface SettingsPanelProps {
  settings: WheelSettings;
  onNoRepeatChange: (v: boolean) => void;
  onBoostFactorChange: (v: number) => void;
  onShowWeightsChange: (v: boolean) => void;
}

export function SettingsPanel({
  settings,
  onNoRepeatChange,
  onBoostFactorChange,
  onShowWeightsChange,
}: SettingsPanelProps) {

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t('settingsTitle')}</h2>
      </div>

      <div className="settings-group">
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settingsNoRepeat')}</span>
            <span className="setting-desc">{t('settingsNoRepeatDesc')}</span>
          </div>
          <button
            className={`toggle-switch${settings.noRepeat ? ' active' : ''}`}
            onClick={() => onNoRepeatChange(!settings.noRepeat)}
          >
            <span className="toggle-knob" />
          </button>
        </div>

        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settingsShowWeights')}</span>
            <span className="setting-desc">{t('settingsShowWeightsDesc')}</span>
          </div>
          <button
            className={`toggle-switch${settings.showWeights ? ' active' : ''}`}
            onClick={() => onShowWeightsChange(!settings.showWeights)}
          >
            <span className="toggle-knob" />
          </button>
        </div>

        <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
          <div className="setting-label">
            <span className="setting-name">{t('settingsBoost')}</span>
            <span className="setting-desc">{t('settingsBoostDesc')}</span>
          </div>
          <div className="slider-row">
            <input
              type="range"
              className="boost-slider"
              min={0}
              max={0.1}
              step={0.01}
              value={settings.boostFactor}
              onChange={(e) => onBoostFactorChange(Number(e.target.value))}
            />
            <span className="slider-value">{settings.boostFactor.toFixed(2)}</span>
          </div>
          <div className="preset-row">
            {[0, 0.02, 0.05, 0.08, 0.1].map((v) => (
              <button
                key={v}
                className={`preset-chip${settings.boostFactor === v ? ' active' : ''}`}
                onClick={() => onBoostFactorChange(v)}
              >
                {v === 0 ? t('settingsBoostOff') : v.toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
