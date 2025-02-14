export type MacroEntry = number[];

export function parseMacroEntries(content: string): number[] {
    // マクロバッファの定義を探す
    const match = content.match(
        /const\s+uint8_t\s+(?:PROGMEM\s+)?default_macro_buffer\[\]\s*=\s*\{([\s\S]*?)\};/
    );
    if (!match) return [];

    // バイト値を抽出
    const bytes = match[1].match(/0x[0-9A-Fa-f]{2}/g);
    if (!bytes) return [];

    return bytes.map(b => parseInt(b, 16));
}

export function generateMacroEntries(bytes: number[]): string {
    let output = "\n// Macro buffer\n";
    output += "const uint8_t PROGMEM default_macro_buffer[] = {\n    ";
    
    // 8バイトごとに改行
    for (let i = 0; i < bytes.length; i++) {
        output += `0x${bytes[i].toString(16).padStart(2, '0')}`;
        if (i < bytes.length - 1) {
            output += ", ";
        }
        if ((i + 1) % 8 === 0 && i < bytes.length - 1) {
            output += "\n    ";
        }
    }
    
    output += "\n};\n";
    return output;
}