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

export interface QmkKeymap {
    version: number;
    author: string;
    notes?: string;
    documentation?: string;
    keyboard: string;
    keymap: string;
    layout: string;
    layers: KeymapLayer[];
    userIncludes?: string;  // ユーザー定義インクルード部分
    userCode?: string;      // ユーザー定義コード部分
}

// C言語のkeymap.cファイルをパースしてQmkKeymapオブジェクトを生成
export function parseKeymapC(
  content: string,
  keyboardJson: {
    layouts: { [key: string]: { layout: { matrix: number[] }[] } };
    dynamic_keymap?: { layer_count?: number };
  }
): QmkKeymap {
  // キーマップ
  const layers: KeymapLayer[] = [];

  // コメントを除去
  content = content.replace(/\/\*[\s\S]*?\*\//g, "");
  content = content.replace(/\/\/.*/g, "");

  // keyboard.jsonのレイヤ定義
  const defaultLayoutName = Object.keys(keyboardJson.layouts)[0];
  const defaultLayout = keyboardJson.layouts[defaultLayoutName]?.layout;
  const targetLayerCount = keyboardJson.dynamic_keymap?.layer_count ?? 4;

  if (!defaultLayout) {
    throw new Error("No layout information found in keyboard.json");
  }

  // keymaps配列の定義を探す
  const keymapsMatch = content.match(
    /const\s+uint16_t\s+PROGMEM\s+keymaps\[[\s\S]*?\]\s*=\s*\{([\s\S]*?)\};/
  );

  // ユーザーセクションを抽出
  let userIncludes = "";
  let userCode = "";
  
  if (keymapsMatch) {
    const keymapsStart = content.indexOf(keymapsMatch[0]);
    const beforeKeymaps = content.slice(0, keymapsStart);
    const afterKeymaps = content.slice(keymapsStart + keymapsMatch[0].length);

    // インクルード部分を抽出
    const includeMatch = beforeKeymaps.match(
      /\/\* USER INCLUDE BEGIN \*\/([\s\S]*?)\/\* USER INCLUDE END \*\//
    );
    if (includeMatch) {
      userIncludes = includeMatch[1].trim();
    }

    // コード部分を抽出
    const codeMatch = afterKeymaps.match(
      /\/\* USER CODE BEGIN \*\/([\s\S]*?)\/\* USER CODE END \*\//
    );
    if (codeMatch) {
      userCode = codeMatch[1].trim();
    }
  }

  // キーマップが見つかっていなかったらデフォルト値を生成
  if (!keymapsMatch) {
    for (let i = 0; i < targetLayerCount; i++) {
      layers.push({
        layout: defaultLayoutName,
        keys: defaultLayout.map((key) => ({
          keycode: "KC_TRANSPARENT",
          matrix: key.matrix,
        })),
      });
    }

    return {
      version: 1,
      author: "",
      keyboard: "",
      keymap: "default",
      layout: layers[0]?.layout || defaultLayoutName,
      layers,
      userIncludes,
      userCode
    };
  }

  // レイヤーごとに分割せずに全体を処理
  const layersStr = keymapsMatch[1];

  // レイヤー定義を探索
  let currentPos = 0;
  let currentLayer = 0;

  while (currentLayer < targetLayerCount && currentPos < layersStr.length) {
    // LAYOUTマクロを探す
    const layoutMatch = layersStr.slice(currentPos).match(/LAYOUT\S*\s*\(/);
    if (!layoutMatch) {
      // 残りのレイヤーをデフォルト値で埋める
      for (let i = currentLayer; i < targetLayerCount; i++) {
        layers.push({
          layout: defaultLayoutName,
          keys: defaultLayout.map((key) => ({
            keycode: "KC_TRANSPARENT",
            matrix: key.matrix,
          })),
        });
      }
      break;
    }

    const layoutStartPos = currentPos + layoutMatch.index!;
    const layoutEndPos = findMatchingBracket(
      layersStr,
      layoutStartPos + layoutMatch[0].length - 1
    );
    if (layoutEndPos === -1) {
      throw new Error(`Invalid LAYOUT macro at layer ${currentLayer}`);
    }

    // LAYOUTマクロ名を取得
    const layoutName = layoutMatch[0].trim().slice(0, -1); // 末尾の(を除去

    // キーコードを抽出
    const keycodesStr = layersStr.slice(
      layoutStartPos + layoutMatch[0].length,
      layoutEndPos
    );
    const keycodes = keycodesStr
      .split(",")
      .map(
        (code) =>
          code
            .replace(/\\/g, "") // エスケープ文字を除去
            .replace(/\n/g, "") // 改行を除去
            .replace(/\r/g, "") // 改行を除去
            .trim()
      )
      .filter((code) => code.length > 0);

    // レイアウト情報を取得
    const layoutInfo =
      keyboardJson.layouts[layoutName] ||
      keyboardJson.layouts[defaultLayoutName];

    // キーコードとマトリクス情報を紐付け
    const keys: KeymapKey[] = layoutInfo.layout.map((key, index) => ({
      keycode: keycodes[index] || "KC_TRANSPARENT",
      matrix: key.matrix,
    }));

    layers.push({
      layout: layoutName,
      keys,
    });

    currentPos = layoutEndPos + 1;
    currentLayer++;
  }

  return {
    version: 1,
    author: "",
    keyboard: "",
    keymap: "default",
    layout: layers[0]?.layout || defaultLayoutName,
    layers,
    userIncludes,
    userCode
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

// QmkKeymapオブジェクトをkeymap.cファイルの内容に変換
export function generateKeymapC(keymap: QmkKeymap): string {
    let output = "";

    // インクルード部分
    output += "// Generated by Vial Keymap C Editor\n\n#include QMK_KEYBOARD_H\n\n";
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

    // ユーザーコード部分
        output += "/* USER CODE BEGIN */\n";
        output += keymap.userCode ?? "";
        output += "\n/* USER CODE END */";

    return output;
}
