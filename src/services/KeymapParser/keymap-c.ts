import { ComboEntry, generateComboEntries, parseComboEntries } from "./comboParser";
import { MacroEntry } from "./macroParser";
import { generateTapDanceEntries, parseTapDanceEntries, TapDanceEntry } from "./tapDanceParser";

export interface KeymapKey {
    keycode: string;  // キーコード (例: "KC_A")
    matrix: number[];  // [row, col]のマトリクス座標
}

export interface KeymapLayer {
    name?: string;
    layout: string;  // LAYOUTマクロの名前
    keys: KeymapKey[];  // キーコードとマトリクス情報
}

export interface QmkKeymap {
    version: number;
    author: string;
    notes?: string;
    documentation?: string;
    keyboard: string;
    keymap: string;
    layout: string;
    layers: KeymapLayer[];
    dynamicLayerCount: number;
    tapDanceEntries: TapDanceEntry[];
    comboEntries: ComboEntry[];
    macroEntries: MacroEntry[];
    dynamicOverrideCount: number;
    userIncludes?: string;  // ユーザー定義インクルード部分
    userCode?: string;      // ユーザー定義コード部分
}


// コメントを除去する関数
function removeComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, "") // マルチラインコメントを除去
    .replace(/\/\/.*/g, "");          // シングルラインコメントを除去
}

// ユーザーセクションを抽出する関数
function extractUserSections(content: string): { userIncludes: string; userCode: string } {
  let userIncludes = "";
  let userCode = "";

  const includeMatch = content.match(
    /\/\* USER INCLUDE BEGIN \*\/([\s\S]*?)\/\* USER INCLUDE END \*\//
  );
  if (includeMatch) {
    userIncludes = includeMatch[1];
  }

  const codeMatch = content.match(
    /\/\* USER CODE BEGIN \*\/([\s\S]*?)\/\* USER CODE END \*\//
  );
  if (codeMatch) {
    userCode = codeMatch[1];
  }

  return { userIncludes, userCode };
}

// キーマップレイヤーを解析する関数
function parseLayer(
  layerStr: string,
  defaultLayout: { layout: { matrix: number[] }[] },
  defaultLayoutName: string
): KeymapLayer {
  // LAYOUTマクロを探す
  const layoutMatch = layerStr.match(/LAYOUT\S*\s*\(/);
  if (!layoutMatch) {
    return {
      layout: defaultLayoutName,
      keys: defaultLayout.layout.map((key) => ({
        keycode: "KC_TRANSPARENT",
        matrix: key.matrix,
      })),
    };
  }

  // LAYOUTマクロ名を取得（末尾の括弧を除去）
  const layoutName = layoutMatch[0].trim().slice(0, -1);

  // キーコードを抽出
  const keycodesStartPos = layoutMatch.index! + layoutMatch[0].length;
  const keycodesEndPos = findMatchingBracket(layerStr, keycodesStartPos - 1);
  
  if (keycodesEndPos === -1) {
    throw new Error("Invalid LAYOUT macro");
  }

  // キーコードをパースする
  const keycodesStr = layerStr.slice(keycodesStartPos, keycodesEndPos);
  const keycodes: string[] = [];
  let currentCode = '';
  let depth = 0;

  for (let i = 0; i < keycodesStr.length; i++) {
    const char = keycodesStr[i];
    
    if (char === '(') {
      depth++;
      currentCode += char;
    } else if (char === ')') {
      depth--;
      currentCode += char;
    } else if (char === ',' && depth === 0) {
      if (currentCode.trim()) {
        keycodes.push(currentCode.trim());
      }
      currentCode = '';
    } else if (!char.match(/[\s\n\r\\]/)) {
      currentCode += char;
    }
  }
  
  // 最後のキーコードを追加
  if (currentCode.trim()) {
    keycodes.push(currentCode.trim());
  }

  // キーコードとマトリクス情報を紐付け
  const keys: KeymapKey[] = defaultLayout.layout.map((key, index) => ({
    keycode: keycodes[index] || "KC_TRANSPARENT",
    matrix: key.matrix,
  }));

  return { layout: layoutName, keys };
}

// キーマップ全体を解析する関数
function parseKeymap(
  content: string,
  dynamicLayerCount: number,
  defaultLayout: { layout: { matrix: number[] }[] },
  defaultLayoutName: string
): KeymapLayer[] {
  const layers: KeymapLayer[] = [];
  
  // keymaps配列の定義を探す
  const keymapsMatch = content.match(
    /const\s+uint16_t\s+PROGMEM\s+keymaps\[[\s\S]*?\]\s*=\s*\{([\s\S]*?)\};/
  );

  if (!keymapsMatch) {
    // デフォルト値を生成
    return Array(dynamicLayerCount).fill(null).map(() => ({
      layout: defaultLayoutName,
      keys: defaultLayout.layout.map((key) => ({
        keycode: "KC_TRANSPARENT",
        matrix: key.matrix,
      })),
    }));
  }

  const layersContent = keymapsMatch[1];
  let currentPos = 0;

  // 各レイヤーを解析
  while (layers.length < dynamicLayerCount && currentPos < layersContent.length) {
    const remainingContent = layersContent.slice(currentPos);
    const layoutMatch = remainingContent.match(/LAYOUT\S*\s*\(/);
    
    if (!layoutMatch) break;

    const layerStartPos = currentPos + layoutMatch.index!;
    const layerEndPos = findMatchingBracket(
      layersContent,
      layerStartPos + layoutMatch[0].length - 1
    );

    if (layerEndPos === -1) break;

    const layerStr = layersContent.slice(layerStartPos, layerEndPos + 1);
    const layer = parseLayer(layerStr, defaultLayout, defaultLayoutName);
    layers.push(layer);

    currentPos = layerEndPos + 1;
  }

  // 不足分をデフォルト値で埋める
  while (layers.length < dynamicLayerCount) {
    layers.push({
      layout: defaultLayoutName,
      keys: defaultLayout.layout.map((key) => ({
        keycode: "KC_TRANSPARENT",
        matrix: key.matrix,
      })),
    });
  }

  return layers;
}

// C言語のkeymap.cファイルをパースしてQmkKeymapオブジェクトを生成
export function parseKeymapC(
  content: string,
  keyboardJson: {
    layouts: { [key: string]: { layout: { matrix: number[] }[] } };
    dynamic_keymap?: { layer_count?: number };
  },
  configH: string
): QmkKeymap {
  // ユーザーセクションを抽出
  const { userIncludes, userCode } = extractUserSections(content);

  // コメントを除去
  content = removeComments(content);

  // 基本設定を取得
  const defaultLayoutName = Object.keys(keyboardJson.layouts)[0];
  const defaultLayout = keyboardJson.layouts[defaultLayoutName];
  const dynamicLayerCount = keyboardJson.dynamic_keymap?.layer_count ?? 4;

  if (!defaultLayout) {
    throw new Error("No layout information found in keyboard.json");
  }

  // 各種動的エントリー数を取得
  const dynamicComboCount = getConfigValue(configH, "VIAL_COMBO_ENTRIES") ?? 0;
  // const dynamicMacroCount = 32;
  const dynamicTapDanceCount = getConfigValue(configH, "VIAL_TAP_DANCE_ENTRIES") ?? 0;
  const dynamicOverrideCount = getConfigValue(configH, "VIAL_KEY_OVERRIDE_ENTRIES") ?? 0;

  // 各セクションを解析
  const layers = parseKeymap(content, dynamicLayerCount, defaultLayout, defaultLayoutName);
  const tapDanceEntries = parseTapDanceEntries(content, dynamicTapDanceCount);
  const comboEntries = parseComboEntries(content, dynamicComboCount);
  // const macroEntries = parseMacroEntries(content, dynamicMacroCount);
  const macroEntries: MacroEntry[] = [];

  return {
    version: 1,
    author: "",
    keyboard: "",
    keymap: "default",
    layout: defaultLayoutName,
    layers,
    dynamicLayerCount,
    dynamicOverrideCount,
    tapDanceEntries,
    comboEntries,
    macroEntries,
    userIncludes,
    userCode,
  };
}

// 対応する閉じ括弧の位置を探す
function findMatchingBracket(str: string, openPos: number): number {
  let depth = 1;
  for (let i = openPos + 1; i < str.length; i++) {
    if (str[i] === '(') depth++;
    if (str[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

// config.hからdefineマクロの値を取得
function getConfigValue(configH: string, name: string): number | undefined {
  const match = configH.match(new RegExp(`#define\\s+${name}\\s+(.+)`));
  if (!match) {
    return undefined;
  }
  try {
    const val = parseInt(match[1]);
    return val;
  } catch {
    return undefined;
  }
}

// QmkKeymapオブジェクトをkeymap.cファイルの内容に変換
export function generateKeymapC(keymap: QmkKeymap): string {
    let output = "";

    // インクルード部分
    output += "// Generated by Vial Keymap C Editor (https://vial-keymap-c-editor.pages.dev)\n\n#include QMK_KEYBOARD_H\n\n";
    output += "/* USER INCLUDE BEGIN */";
    output += keymap.userIncludes ?? "";
    output += "/* USER INCLUDE END */\n\n";

    // キーマップ定義
    output += `const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
`;

    // 各レイヤーのキーマップを生成
    keymap.layers.forEach((layer, index) => {
        output += `    [${index}] = ${layer.layout}(\n`;
        
        // キーコードを4つごとに改行を入れて整形
        for (let i = 0; i < layer.keys.length; i += 4) {
            output += '        ' + layer.keys.slice(i, i + 4)
              .map(key => key.keycode.padStart(15))
              .join(', ');
            if (i + 4 < layer.keys.length) {
                output += ',';
            }
            output += '\n';
        }

        output += '    )';
        if (index < keymap.layers.length - 1) {
            output += ',';
        }
        output += '\n';
    });

    output += '};\n';

    // Tap Dance定義の生成
    output += generateTapDanceEntries(keymap.tapDanceEntries);

    // Combo定義の生成
    output += generateComboEntries(keymap.comboEntries);

    // TODO: macro
    // // Macro定義の生成
    // output +=  generateMacroEntries(keymap.macroEntries);

    // 初期化コード
    output += `
// Initialize Vial dynamic items
__attribute__((weak)) void eeconfig_init_user_manual(void) {}
void                       eeconfig_init_user(void) {
#if VIAL_TAP_DANCE_ENTRIES > 0
    for (size_t i = 0; i < sizeof(default_tap_dance_entries) / sizeof(default_tap_dance_entries[0]); ++i) {
        dynamic_keymap_set_tap_dance(i, &default_tap_dance_entries[i]);
    }
#endif
#if VIAL_COMBO_ENTRIES > 0
    for (size_t i = 0; i < sizeof(default_combo_entries) / sizeof(default_combo_entries[0]); ++i) {
        dynamic_keymap_set_combo(i, &default_combo_entries[i]);
    }
#endif

    eeconfig_init_user_manual();
}`;

    // ユーザーコード部分
        output += "\n/* USER CODE BEGIN */";
        output += keymap.userCode ?? "";
        output += "/* USER CODE END */";

    return output;
}
