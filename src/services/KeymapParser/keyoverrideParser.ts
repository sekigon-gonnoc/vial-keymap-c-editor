export interface KeyOverrideEntry {
  trigger: string;        // trigger keycode
  replacement: string;    // replacement keycode
  layers: number;         // layer mask
  triggerMods: number;    // trigger mods (uint8_t)
  negativeModMask: number;// negative mod mask (uint8_t)
  suppressedMods: number; // suppressed mods (uint8_t)
  options: number;        // options (uint8_t)
}

const modMaskMap: { [key: string]: number } = {
    KC_LCTL: 1 << 0,
    KC_LSFT: 1 << 1,
    KC_LALT: 1 << 2,
    KC_LGUI: 1 << 3,
    KC_RCTL: 1 << 4,
    KC_RSFT: 1 << 5,
    KC_RALT: 1 << 6,
    KC_RGUI: 1 << 7
    };

function parseModMask(modmask: string): number {
    const modmaskRegex = /MOD_BIT\(([^)]+)\)/g;
    let match;
    let result = 0;
    while ((match = modmaskRegex.exec(modmask)) !== null) {
        const mod = match[1];
        if (mod in modMaskMap) {
            result |= modMaskMap[mod];
        }
    }
    return result;
}

function generateModMask(modmask: number): string {
    const mask = Object.keys(modMaskMap)
        .filter((mod) => (modmask & modMaskMap[mod]) !== 0)
        .map((mod) => `MOD_BIT(${mod})`)
        .join(" | ");
    if (mask === "") return "0";
    return mask;
}

const optionMap: { [key: string]: number } = {
    vial_ko_option_activation_trigger_down : (1 << 0),
    vial_ko_option_activation_required_mod_down : (1 << 1),
    vial_ko_option_activation_negative_mod_up : (1 << 2),
    vial_ko_option_one_mod : (1 << 3),
    vial_ko_option_no_reregister_trigger : (1 << 4),
    vial_ko_option_no_unregister_on_other_key_down : (1 << 5),
    vial_ko_enabled : (1 << 7),
};


function parseOptions(options: string): number {
  // | で結合されたオプションをパース
  return options.split("|").reduce((acc, option) => {
    option = option.trim();
    if (option in optionMap) {
      acc |= optionMap[option];
    }
    return acc;
  }, 0);
}

function generateOptions(options: number): string {
  const mask = Object.keys(optionMap)
    .filter((option) => (options & optionMap[option]) !== 0)
    .join(" | ");
    if (mask === "") return "0";
    return mask;
}


export function parseKeyOverrideEntries(
  content: string,
  dynamicOverrideCount: number
): KeyOverrideEntry[] {
  const defaultEntry: KeyOverrideEntry = {
    trigger: "KC_NO",
    replacement: "KC_NO",
    layers: 0xffff,
    triggerMods: 0,
    negativeModMask: 0,
    suppressedMods: 0,
    options: 0
  };

  const entries: KeyOverrideEntry[] = Array(dynamicOverrideCount).fill(null).map(() => ({...defaultEntry}));

  // 構造体配列定義を探す（コメントや改行を含む形式に対応）
  const koArrayMatch = content.match(
    /(?:\/\/[^\n]*\n)*const\s+vial_key_override_entry_t\s+(?:PROGMEM\s+)?default_key_override_entries\[\]\s*=\s*\{([\s\S]*?)\}\s*;/
  );
  if (!koArrayMatch) return entries;

  // エントリを行単位で分割して解析
  const koContent = koArrayMatch[1];
  const entryLines = koContent.split(/},?\s*\n\s*/);
  let currentIndex = 0;

  for (const entryLine of entryLines) {
    if (currentIndex >= dynamicOverrideCount) break;
    if (!entryLine.trim()) continue;

    // 構造体の開始部分を探す
    const struct = entryLine.match(/\{\s*([^}]+)/);
    if (!struct) continue;

    // フィールドを括弧の対応を考慮して分割
    const contentStr = struct[1];
    const fields: string[] = [];
    let currentField = '';
    let depth = 0;

    for (let i = 0; i < contentStr.length; i++) {
      const char = contentStr[i];
      if (char === '(' || char === '{') {
        depth++;
        currentField += char;
      } else if (char === ')' || char === '}') {
        depth--;
        currentField += char;
      } else if (char === ',' && depth === 0) {
        // コメントを除去して追加
        const fieldWithoutComment = currentField.replace(/\/\/.*$/, '').trim();
        if (fieldWithoutComment) {
          fields.push(fieldWithoutComment);
        }
        currentField = '';
      } else if (!char.match(/^\s*\/\//)) { // コメント行をスキップ
        currentField += char;
      }
    }
    // 最後のフィールドを追加
    if (currentField.trim()) {
      const fieldWithoutComment = currentField.replace(/\/\/.*$/, '').trim();
      if (fieldWithoutComment) {
        fields.push(fieldWithoutComment);
      }
    }

    if (fields.length >= 7) {
      try {
        entries[currentIndex] = {
          trigger: fields[0],
          replacement: fields[1],
          layers: parseInt(fields[2], 16),
          triggerMods: parseModMask(fields[3]),
          negativeModMask: parseModMask(fields[4]),
          suppressedMods: parseModMask(fields[5]),
          options: parseOptions(fields[6])
        };
        currentIndex++;
      } catch (e) {
        console.error(e);
      }
    }
  }

  return entries;
}

export function generateKeyOverrideEntries(entries: KeyOverrideEntry[]): string {
  let output = '\n// Key Override definitions\n';
  output += '#if VIAL_KEY_OVERRIDE_ENTRIES > 0\n';
  output += 'const vial_key_override_entry_t default_key_override_entries[] = {\n';
  
  entries.forEach((entry, index) => {
    output += '    {\n';
    output += `        ${entry.trigger}, // trigger key\n`;
    output += `        ${entry.replacement}, // replacement key\n`;
    output += `        0x${entry.layers.toString(16).padStart(4, '0')}, // layer mask\n`;
    output += `        ${generateModMask(entry.triggerMods)}, // trigger mods\n`;
    output += `        ${generateModMask(entry.negativeModMask)}, // negative mod mask\n`;
    output += `        ${generateModMask(entry.suppressedMods)}, // suppressed mods\n`;
    output += `        ${generateOptions(entry.options)} // options\n`;
    output += '    }';
    if (index < entries.length - 1) output += ',';
    output += '\n';
  });

  output += '};\n';
  output += '#endif\n';

  return output;
}

export function changeKeyOverrideCount(
  entries: KeyOverrideEntry[],
  newCount: number
): KeyOverrideEntry[] {
  if (newCount === entries.length || newCount < 0 || newCount > 32) {
    return entries;
  }
  const defaultEntry: KeyOverrideEntry = {
    trigger: "KC_NO",
    replacement: "KC_NO",
    layers: 0xffff,
    triggerMods: 0,
    negativeModMask: 0,
    suppressedMods: 0,
    options: 0
  };
  const newEntries = Array.from({ length: newCount }, (_, index) => {
    if (index < entries.length) {
      return entries[index];
    } else {
      return { ...defaultEntry };
    }
  });
  return newEntries;
}
