import { useI18n } from '../hooks/useI18n';
import type { AppSettings } from '../types';

interface SettingsPanelProps {
  settings: AppSettings;
  onNoRepeatChange: (v: boolean) => void;
  onBoostFactorChange: (v: number) => void;
}

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFD93D',
  '#FF8A65', '#BA68C8', '#4DB6AC', '#7986CB', '#F06292',
];

export function SettingsPanel({
  settings,
  onNoRepeatChange,
  onBoostFactorChange,
}: SettingsPanelProps) {
  const { t } = useI18n();

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>{t('settingsTitle')}</h2>
      </div>

      <div className="settings-group">
        {/* No Repeat Toggle */}
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settingsNoRepeat')}</span>
            <span className="setting-desc">{t('settingsNoRepeatDesc')}</span>
          </div>
          <button
            className={`toggle-switch${settings.noRepeat ? ' active' : ''}`}
            onClick={() => onNoRepeatChange(!settings.noRepeat)}
            role="switch"
            aria-checked={settings.noRepeat}
          >
            <span className="toggle-knob" />
          </button>
        </div>

        {/* Boost Factor Slider */}
        <div className="setting-row">
          <div className="setting-label">
            <span className="setting-name">{t('settingsBoost')}</span>
            <span className="setting-desc">{t('settingsBoostDesc')}</span>
          </div>
        </div>
        <div className="slider-row">
          <input
            type="range"
            className="boost-slider"
            min="0"
            max="0.1"
            step="0.005"
            value={settings.boostFactor}
            onChange={(e) => onBoostFactorChange(parseFloat(e.target.value))}
          />
          <span className="slider-value">{settings.boostFactor.toFixed(3)}</span>
        </div>

        {/* Boost presets */}
        <div className="preset-row">
          {[0, 0.03, 0.05, 0.08, 0.1].map((v) => (
            <button
              key={v}
              className={`preset-chip${Math.abs(settings.boostFactor - v) < 0.001 ? ' active' : ''}`}
              onClick={() => onBoostFactorChange(v)}
            >
              {v === 0 ? t('settingsBoostOff') : `×${v}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
