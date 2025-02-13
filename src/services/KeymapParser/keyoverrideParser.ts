export interface KeyOverrideEntry {
  triggerMods: number;
  layers: number;
  trigger: string;        // trigger keycode
  replacement: string;     // replacement keycode
  suppressedMods: number;
  options: number;
  negativeModMask: number;
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
    triggerMods: 0,
    trigger: "KC_NO",
    replacement: "KC_NO",
    layers: 0xffff,
    suppressedMods: 0,
    options: 0,
    negativeModMask: 0
  };

  const entries: KeyOverrideEntry[] = Array(dynamicOverrideCount).fill(null).map(() => ({...defaultEntry}));

  // const key_override_t default_key_override[]の定義を探す
  const koArrayMatch = content.match(/const\s+key_override_t\s+(?:PROGMEM\s+)?default_key_override_entries\[\]\s*=\s*\{([^}]+)\};/);
  if (!koArrayMatch) return entries;

  const koContent = koArrayMatch[1];
  let currentPos = 0;
  let currentIndex = 0;
  let depth = 0;

  // ko_make_with_layers_negmods_and_options呼び出しを解析
  while (currentIndex < dynamicOverrideCount) {
    const startPos = koContent.indexOf('ko_make_with_layers_negmods_and_options', currentPos);
    if (startPos === -1) break;

    // 括弧の対応を考慮して引数部分を抽出
    let endPos = startPos;
    depth = 0;
    for (let i = startPos; i < koContent.length; i++) {
      if (koContent[i] === '(') depth++;
      else if (koContent[i] === ')') {
        depth--;
        if (depth === 0) {
          endPos = i + 1;
          break;
        }
      }
    }
    if (depth !== 0) break;

    // 引数を括弧の対応を考慮して分割
    const call = koContent.slice(startPos, endPos);
    const argsStart = call.indexOf('(') + 1;
    const argsContent = call.slice(argsStart, -1);
    
    const args: string[] = [];
    let currentArg = '';
    depth = 0;

    for (let i = 0; i < argsContent.length; i++) {
      const char = argsContent[i];
      if (char === '(' || char === '{') {
        depth++;
        currentArg += char;
      } else if (char === ')' || char === '}') {
        depth--;
        currentArg += char;
      } else if (char === ',' && depth === 0) {
        args.push(currentArg.trim());
        currentArg = '';
      } else {
        currentArg += char;
      }
    }
    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }

    if (args.length >= 6) {
      try {
        entries[currentIndex] = {
          triggerMods: parseModMask(args[0]),
          trigger: args[1],
          replacement: args[2],
          layers: parseInt(args[3]),
          negativeModMask: parseModMask(args[4]),
          options: parseOptions(args[5]),
          suppressedMods: 0
        };
        currentIndex++;
      } catch (e) {
        console.error(e);
      }
    }

    currentPos = endPos;
  }

  return entries;
}

export function generateKeyOverrideEntries(entries: KeyOverrideEntry[]): string {
  if (entries.length === 0) return '';

  let output = '\n// Key Override definitions\n';
  output += 'const key_override_t default_key_override_entries[] = {\n';
  
  entries.forEach((entry, index) => {
    output += '    ko_make_with_layers_negmods_and_options(\n';
    output += `        ${generateModMask(entry.triggerMods)}, // trigger mods\n`;
    output += `        ${entry.trigger}, // trigger key\n`;
    output += `        ${entry.replacement}, // replacement key\n`;
    output += `        0x${entry.layers.toString(16).padStart(4, '0')}, // layer mask\n`;
    output += `        ${generateModMask(entry.negativeModMask)}, // negative mod mask\n`;
    output += `        ${generateOptions(entry.options)} // options\n`;
    output += '    )';
    if (index < entries.length - 1) output += ',';
    output += '\n';
  });

  output += '};\n';
  return output;
}
