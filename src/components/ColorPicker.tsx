import { t } from '../i18n';

const PRESET_COLORS = [
  '#FF6B6B', '#FF8E72', '#FFA94D', '#FFD43B', '#FF922B',
  '#69DB7C', '#38D9A9', '#4ECDC4', '#20C997', '#63E6BE',
  '#4DABF7', '#45B7D1', '#74C0FC', '#3BC9DB', '#15AABF',
  '#748FFC', '#9775FA', '#7950F2', '#DA77F2', '#E599F7',
  '#F783AC', '#F06595', '#E64980', '#FA5252',
  '#868E96', '#ADB5BD', '#495057', '#6C757D', '#343A40',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {

  return (
    <div className="color-picker">
      {PRESET_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          className={`color-swatch${c === value ? ' active' : ''}`}
          style={{ backgroundColor: c }}
          onClick={() => onChange(c)}
          aria-label={`${t('colorPick')} ${c}`}
        />
      ))}
    </div>
  );
}
