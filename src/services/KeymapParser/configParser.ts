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
    .replace(/^\s*#\s*define\s+DYNAMIC_KEYMAP_LAYER_COUNT\s+\d+\s*\r?\n/gm, '')
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

interface UpdateResult {
  configH: string;
  keyboardJson: any;
}

export function updateQuantumSettings(
  configH: string,
  keyboardJson: any,
  values: { [id: string]: number | undefined }
): UpdateResult {
  let newConfigH = configH;
  let newKeyboardJson = { ...keyboardJson };

  Object.entries(values).forEach(([key, value]) => {
    if (value === undefined) {
      if (key === key.toUpperCase()) {
        newConfigH = newConfigH.replace(new RegExp(`#define ${key}.*?\n`, 'g'), '');
      } else {
        // キーに.が含まれている場合は階層的に削除
        const keyParts = key.split('.');
        const parents: { obj: any, key: string }[] = [];
        let current = newKeyboardJson;

        // 親要素を記録しながら目的の要素まで移動
        for (let i = 0; i < keyParts.length - 1; i++) {
          if (current[keyParts[i]] === undefined) break;
          parents.push({ obj: current, key: keyParts[i] });
          current = current[keyParts[i]];
        }

        // 目的の要素を削除
        if (current[keyParts[keyParts.length - 1]] !== undefined) {
          delete current[keyParts[keyParts.length - 1]];
        }

        // 親要素が空になった場合、順次削除
        for (let i = parents.length - 1; i >= 0; i--) {
          const { obj, key } = parents[i];
          if (Object.keys(obj[key]).length === 0) {
            delete obj[key];
          } else {
            break;
          }
        }
      }
    } else {
      if (key === key.toUpperCase()) {
        const defineRegex = new RegExp(`#define ${key}.*?\n`, 'g');
        const newLine = `#define ${key} ${value}\n`;
        if (newConfigH.match(defineRegex)) {
          newConfigH = newConfigH.replace(defineRegex, newLine);
        } else {
          newConfigH = newConfigH + newLine;
        }
      } else {
        const keyParts = key.split('.');
        let current = newKeyboardJson;
        for (let i = 0; i < keyParts.length - 1; i++) {
          if (current[keyParts[i]] === undefined) {
            current[keyParts[i]] = {};
          }
          current = current[keyParts[i]];
        }
        current[keyParts[keyParts.length - 1]] = value;
      }
    }
  });

  console.log(newConfigH);
  console.log(newKeyboardJson);

  return { configH: newConfigH, keyboardJson: newKeyboardJson };
}
