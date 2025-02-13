export interface EncoderEntry {
  ccw: string;   // 反時計回り
  cw: string;    // 時計回り
}

export function parseEncoderEntries(
  content: string,
  encoderCount: number,
  dynamicLayerCount: number
): EncoderEntry[][] {
  const encoders: EncoderEntry[][] = [];

  // encoder_mapの定義を探す
  const encoderMatch = content.match(
    /const\s+uint16_t\s+(?:PROGMEM\s+)?encoder_map\[[\s\S]*?\]\[[\s\S]*?\]\[[\s\S]*?\]\s*=\s*\{([\s\S]*?)\};/
  );

  if (!encoderMatch) {
    // デフォルト値を返す
    return Array(dynamicLayerCount)
      .fill(null)
      .map(() =>
        Array(encoderCount)
          .fill(null)
          .map(() => ({
            ccw: "KC_TRANSPARENT",
            cw: "KC_TRANSPARENT",
          }))
      );
  }

  const encoderContent = encoderMatch[1];
  const layerBlocks = encoderContent
    .split(/\},\s*\{|\},|\{/)
    .filter((block) => block.trim());

  layerBlocks.forEach((layerBlock) => {
    const encoderLayer: EncoderEntry[] = [];
    const encoderPairs = layerBlock
      .split(/\},\s*\{|\},|\{/)
      .filter((pair) => pair.trim());

    encoderPairs.forEach((pair) => {
      const values = pair
        .split(",")
        .map((v) => v.trim().replace(/[{}]/g, "")) // 波括弧を除去
        .filter((v) => v)
        .map(v => v.trim()); // 再度trimを行い余分な空白を除去
      if (values.length >= 2) {
        encoderLayer.push({
          ccw: values[0],
          cw: values[1],
        });
      }
    });

    if (encoderLayer.length > 0) {
      // 不足分を補完
      while (encoderLayer.length < encoderCount) {
        encoderLayer.push({
          ccw: "KC_TRANSPARENT",
          cw: "KC_TRANSPARENT",
        });
      }
      encoders.push(encoderLayer);
    }
  });

  // レイヤー数を32に揃える
  while (encoders.length < dynamicLayerCount) {
    encoders.push(
      Array(encoderCount)
        .fill(null)
        .map(() => ({
          ccw: "KC_TRANSPARENT",
          cw: "KC_TRANSPARENT",
        }))
    );
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
