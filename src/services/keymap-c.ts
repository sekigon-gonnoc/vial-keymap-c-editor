import { sliderClasses } from "@mui/material";

export interface KeymapKey {
    keycode: string;  // キーコード (例: "KC_A")
    matrix: number[];  // [row, col]のマトリクス座標
}

export interface KeymapLayer {
    name?: string;
    layout: string;  // LAYOUTマクロの名前
    keys: KeymapKey[];  // キーコードとマトリクス情報
}

export interface TapDanceEntry {
    onTap: string;
    onHold: string;
    onDoubleTap: string;
    onTapHold: string;
    tappingTerm: number;
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
    dynamicMacroCount: number;
    tapDanceEntries: TapDanceEntry[];
    dynamicComboCount: number;
    dynamicOverrideCount: number;
    userIncludes?: string;  // ユーザー定義インクルード部分
    userCode?: string;      // ユーザー定義コード部分
}

// TAPDANCEマクロの解析
function parseTapDanceEntries(
  content: string,
  entryCount: number
): TapDanceEntry[] {
  const defaultTapDanceEntry: TapDanceEntry = {
    onTap: "KC_NO",
    onHold: "KC_NO",
    onDoubleTap: "KC_NO",
    onTapHold: "KC_NO",
    tappingTerm: 200,
  };
  const entries: TapDanceEntry[] = Array.from(
    { length: entryCount },
    () => ({ ...defaultTapDanceEntry })
  );

// tap dance定義を探す
  const tdMatch = content.match(
    /const\s+vial_tap_dance_entry_t\s+(?:PROGMEM\s+)?default_tap_dance_entries\[\]\s*=\s*\{([\s\S]*?)\};/
  );
  if (!tdMatch) return entries;

  // TAP_DANCE_ENTRYマクロを探す
  const entryRegex =
    /TAP_DANCE_ENTRY\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*(\d+)\s*\)/g;
  const entriesStr = tdMatch[1];

  let match;
  let index = 0;
  while ((match = entryRegex.exec(entriesStr)) !== null && index < entryCount) {
    entries[index] = {
      onTap: match[1].trim(),
      onHold: match[2].trim(),
      onDoubleTap: match[3].trim(),
      onTapHold: match[4].trim(),
      tappingTerm: parseInt(match[5]),
    };
    index++;
  }

  return entries;
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
    userIncludes = includeMatch[1].trim();
  }

  const codeMatch = content.match(
    /\/\* USER CODE BEGIN \*\/([\s\S]*?)\/\* USER CODE END \*\//
  );
  if (codeMatch) {
    userCode = codeMatch[1].trim();
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

  const keycodes = layerStr
    .slice(keycodesStartPos, keycodesEndPos)
    .split(",")
    .map((code) => code.replace(/[\\\n\r]/g, "").trim())
    .filter((code) => code.length > 0);

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
  const dynamicMacroCount = 32;
  const dynamicTapDanceCount = getConfigValue(configH, "VIAL_TAP_DANCE_ENTRIES") ?? 0;
  const dynamicOverrideCount = getConfigValue(configH, "VIAL_KEY_OVERRIDE_ENTRIES") ?? 0;

  // 各セクションを解析
  const { userIncludes, userCode } = extractUserSections(content);
  const layers = parseKeymap(content, dynamicLayerCount, defaultLayout, defaultLayoutName);
  const tapDanceEntries = parseTapDanceEntries(content, dynamicTapDanceCount);

  return {
    version: 1,
    author: "",
    keyboard: "",
    keymap: "default",
    layout: defaultLayoutName,
    layers,
    dynamicLayerCount,
    dynamicComboCount,
    dynamicMacroCount,
    dynamicOverrideCount,
    tapDanceEntries,
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
    output += "/* USER INCLUDE BEGIN */\n";
    output += (keymap.userIncludes || "").trim();
    output += "\n/* USER INCLUDE END */\n\n";

    // キーマップ定義
    output += `const uint16_t PROGMEM keymaps[][MATRIX_ROWS][MATRIX_COLS] = {
`;

    // 各レイヤーのキーマップを生成
    keymap.layers.forEach((layer, index) => {
        output += `    [${index}] = ${layer.layout}(\n`;
        
        // キーコードを4つごとに改行を入れて整形
        for (let i = 0; i < layer.keys.length; i += 4) {
            output += '        ' + layer.keys.slice(i, i + 4)
                .map(key => key.keycode)
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
    if (keymap.tapDanceEntries && keymap.tapDanceEntries.length > 0) {
        output += "\n// Tap Dance definitions\n";
        output += `#define TAP_DANCE_ENTRY(onTap, onHold, onDoubleTap, onTapHold, tappingTerm) ((vial_tap_dance_entry_t){.on_tap = onTap, .on_hold = onHold, .on_double_tap = onDoubleTap, .on_tap_hold = onTapHold, .custom_tapping_term = tappingTerm})\n`;
        output += `#if VIAL_TAP_DANCE_ENTRIES > 0\n`;
        output += "const vial_tap_dance_entry_t default_tap_dance_entries[] = {\n";
        keymap.tapDanceEntries.forEach((entry, index) => {
            output += `    TAP_DANCE_ENTRY(${entry.onTap}, ${entry.onHold}, ${entry.onDoubleTap}, ${entry.onTapHold}, ${entry.tappingTerm})`;
            if (index < keymap.tapDanceEntries.length - 1) {
                output += ",";
            }
            output += "\n";
        });
        output += "};\n";
        output += `#endif\n`;
    }

    // ユーザーコード部分
        output += "\n/* USER CODE BEGIN */\n";
        output += keymap.userCode ?? "";
        output += "\n/* USER CODE END */";

    return output;
}
