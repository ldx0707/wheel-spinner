export interface SpinOption {
  id: string;
  name: string;
  weight: number;
  color: string;
}

export interface SpinHistoryEntry {
  id: string;
  optionName: string;
  optionColor: string;
  weight: number;
  timestamp: number;
}

export interface WeightedOption {
  id: string;
  weight: number;
  boost: number;
}

export interface AppSettings {
  noRepeat: boolean;
  boostFactor: number;
}
