export interface EncoderEntry {
  ccw: string;   // 反時計回り
  cw: string;    // 時計回り
}

export function parseEncoderEntries(
  content: string,
  encoderCount: number,
  dynamicLayerCount: number
): EncoderEntry[][] {
  // デフォルト値を準備
  const defaultEntry: EncoderEntry = {
    ccw: "KC_TRANSPARENT",
    cw: "KC_TRANSPARENT"
  };
  const encoders: EncoderEntry[][] = Array(dynamicLayerCount)
    .fill(null)
    .map(() => Array(encoderCount).fill(null).map(() => ({...defaultEntry})));

  // encoder_mapの定義を探す
  const encoderMatch = content.match(
    /const\s+uint16_t\s+(?:PROGMEM\s+)?encoder_map\[[\s\S]*?\]\[[\s\S]*?\]\[[\s\S]*?\]\s*=\s*\{([\s\S]*?)\};/
  );
  if (!encoderMatch) return encoders;

  const encoderContent = encoderMatch[1];
  let pos = 0;

  // レイヤー定義を探す
  while (pos < encoderContent.length) {
    // レイヤー番号を探す
    const layerMatch = encoderContent.slice(pos).match(/\[\s*(\d+)\s*\]\s*=\s*\{/);
    if (!layerMatch) break;

    const layerIndex = parseInt(layerMatch[1]);
    if (layerIndex >= dynamicLayerCount) {
      pos += layerMatch.index! + layerMatch[0].length;
      continue;
    }

    // レイヤーの終わりを探す（括弧の対応を考慮）
    const layerStart = pos + layerMatch.index! + layerMatch[0].length;
    let depth = 1;
    let layerEnd = layerStart;

    for (let i = layerStart; i < encoderContent.length; i++) {
      if (encoderContent[i] === '{') depth++;
      else if (encoderContent[i] === '}') {
        depth--;
        if (depth === 0) {
          layerEnd = i;
          break;
        }
      }
    }

    const layerContent = encoderContent.slice(layerStart, layerEnd);
    let encoderIndex = 0;

    // エンコーダー定義を探す
    const encoderPairs = [];
    depth = 0;
    let start = 0;

    for (let i = 0; i < layerContent.length; i++) {
      const char = layerContent[i];
      if (char === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          encoderPairs.push(layerContent.slice(start, i + 1));
        }
      }
    }

    // 各エンコーダーの設定をパース
    encoderPairs.forEach(pair => {
      if (encoderIndex >= encoderCount) return;

      // 波括弧の中身を取り出し、括弧のネストを考慮してカンマで分割
      const innerPair = pair.trim();
      if (!innerPair.startsWith('{') || !innerPair.endsWith('}')) return;
      
      const content = innerPair.slice(1, -1);
      let depth = 0;
      let commaPos = -1;

      // ネストを考慮してカンマの位置を探す
      for (let i = 0; i < content.length; i++) {
        const char = content[i];
        if (char === '(' || char === '{') {
          depth++;
        } else if (char === ')' || char === '}') {
          depth--;
        } else if (char === ',' && depth === 0) {
          commaPos = i;
          break;
        }
      }

      if (commaPos !== -1) {
        const ccw = content.slice(0, commaPos).trim();
        const cw = content.slice(commaPos + 1).trim();
        encoders[layerIndex][encoderIndex] = { ccw, cw };
      }
      
      encoderIndex++;
    });

    pos = layerEnd + 1;
  }

  return encoders;
}

export function generateEncoderEntries(encoders: EncoderEntry[][]): string {
  if (encoders.length === 0) return '';

  let output = '\n#if defined(ENCODER_MAP_ENABLE)\nconst uint16_t PROGMEM encoder_map[][NUM_ENCODERS][NUM_DIRECTIONS] = {\n';

  encoders.forEach((layer, layerIndex) => {
    if (layer.length === 0) return;

    output += '    [' + layerIndex + '] = {\n';
    layer.forEach((encoder, index) => {
      output += `        { ${encoder.ccw.padEnd(15)}, ${encoder.cw.padEnd(15)} }`;
      if (index < layer.length - 1) output += ',';
      output += '\n';
    });
    output += '    }';
    if (layerIndex < encoders.length - 1) output += ',';
    output += '\n';
  });

  output += '};\n#endif\n';
  return output;
}
