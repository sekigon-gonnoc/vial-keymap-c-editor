// config.h の設定値を保持する型
export interface VialConfig {
  tapDanceEntries: number;
  comboEntries: number;
  keyOverrideEntries: number;
}

// config.h から VIAL の設定値を抽出
export function parseVialConfig(configContent: string): VialConfig {
  const getDefineValue = (name: string): number | undefined => {
    const match = configContent.match(new RegExp(`#define\\s+${name}\\s+(.+)`));
    if (match) {
      try {
        return parseInt(match[1]);
      } catch (e) {
        return undefined;
      }
    }
    return undefined;
  };

  return {
    tapDanceEntries: getDefineValue("VIAL_TAP_DANCE_ENTRIES") ?? 4,
    comboEntries: getDefineValue("VIAL_COMBO_ENTRIES") ?? 4,
    keyOverrideEntries: getDefineValue("VIAL_KEY_OVERRIDE_ENTRIES") ?? 4,
  };
}

// config.h の設定値を更新（3項目のみを末尾に追加/更新）
export function updateVialConfig(configContent: string, newConfig: Partial<VialConfig>): string {
  let content = configContent;
  
  // 既存の定義を削除 (行末の改行も含めて削除)
  content = content
    .replace(/^\s*#\s*define\s+VIAL_TAP_DANCE_ENTRIES\s+\d+\s*\r?\n/gm, '')
    .replace(/^\s*#\s*define\s+VIAL_COMBO_ENTRIES\s+\d+\s*\r?\n/gm, '')
    .replace(/^\s*#\s*define\s+VIAL_KEY_OVERRIDE_ENTRIES\s+\d+\s*\r?\n/gm, '');

  // 末尾に新しい定義を追加
  content = content.trim() + '\n\n';
  content += `#define VIAL_TAP_DANCE_ENTRIES ${newConfig.tapDanceEntries ?? 0}\n`;
  content += `#define VIAL_COMBO_ENTRIES ${newConfig.comboEntries ?? 0}\n`;
  content += `#define VIAL_KEY_OVERRIDE_ENTRIES ${newConfig.keyOverrideEntries ?? 0}\n`;

  return content;
}
