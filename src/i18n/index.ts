const translations: Record<string, Record<string, string>> = {
  // App
  appTitle: { zh: '转盘选择器', en: 'Wheel Spinner' },
  tabWheel: { zh: '转盘', en: 'Wheel' },
  tabOptions: { zh: '选项', en: 'Options' },
  tabHistory: { zh: '记录', en: 'History' },
  spinBtnSpinning: { zh: '转动中…', en: 'Spinning...' },
  spinBtnNeedMore: { zh: '至少需要2个选项', en: 'Need 2+ options' },
  spinBtnGo: { zh: '🎰 开始转动', en: '🎰 SPIN' },
  resultSelected: { zh: '选中：', en: 'Selected: ' },
  resultWeight: { zh: '权重', en: 'Weight' },
  muteOn: { zh: '开启声音', en: 'Unmute' },
  muteOff: { zh: '关闭声音', en: 'Mute' },

  // Wheel
  wheelEmpty: { zh: '请添加选项', en: 'Add options' },
  wheelWeight: { zh: '权重', en: 'W' },

  // OptionPanel
  optTitle: { zh: '选项列表', en: 'Options' },
  optAdd: { zh: '+ 添加', en: '+ Add' },
  optEmpty: { zh: '暂无选项，点击「添加」创建', en: 'No options yet, tap + Add' },
  optName: { zh: '名称', en: 'Name' },
  optNamePlaceholder: { zh: '输入选项名称', en: 'Option name' },
  optWeight: { zh: '权重', en: 'Weight' },
  optWeightRange: { zh: '权重 (1-10000)', en: 'Weight (1-10000)' },
  optColor: { zh: '颜色', en: 'Color' },
  optSave: { zh: '保存', en: 'Save' },
  optCancel: { zh: '取消', en: 'Cancel' },
  optEdit: { zh: '编辑', en: 'Edit' },
  optDelete: { zh: '删除', en: 'Delete' },
  optErrName: { zh: '名称不能为空', en: 'Name is required' },
  optErrWeight: { zh: '权重范围 1-10000', en: 'Weight must be 1-10000' },

  // ColorPicker
  colorPick: { zh: '选择颜色', en: 'Select color' },

  // HistoryPanel
  // Settings
  tabSettings: { zh: '设置', en: 'Settings' },
  settingsTitle: { zh: '设置', en: 'Settings' },
  settingsNoRepeat: { zh: '禁止连续重复', en: 'No consecutive repeats' },
  settingsNoRepeatDesc: { zh: '开启后相邻两次转盘不会选中同一选项', en: 'Prevents the same option from being selected twice in a row' },
  settingsBoost: { zh: '冷门补偿系数', en: 'Streak boost' },
  settingsBoostDesc: { zh: '选项未被选中时概率逐渐增加的幅度', en: 'How much probability increases each time an option is missed' },
  settingsBoostOff: { zh: '关闭', en: 'Off' },
  histTitle: { zh: '历史记录', en: 'History' },
  histClear: { zh: '清空', en: 'Clear' },
  histEmpty: { zh: '暂无记录，转动转盘开始记录', en: 'No history yet. Spin to record.' },
  histWeight: { zh: '权重', en: 'Weight' },
  histPrev: { zh: '上一页', en: 'Prev' },
  histNext: { zh: '下一页', en: 'Next' },
};

export type Lang = 'zh' | 'en';

const LANG_KEY = 'wheel_lang';

function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'zh' || v === 'en') return v;
  } catch { /* */ }
  return 'zh';
}

let currentLang: Lang = loadLang();

function saveLang(l: Lang) {
  currentLang = l;
  try { localStorage.setItem(LANG_KEY, l); } catch { /* */ }
}

export function getLang(): Lang {
  return currentLang;
}

export function setLang(l: Lang) {
  saveLang(l);
}

export function toggleLang(): Lang {
  const next = currentLang === 'zh' ? 'en' : 'zh';
  saveLang(next);
  return next;
}

export function t(key: string): string {
  return translations[key]?.[currentLang] ?? key;
}
