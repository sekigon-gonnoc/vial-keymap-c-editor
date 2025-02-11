
export interface TapDanceEntry {
    onTap: string;
    onHold: string;
    onDoubleTap: string;
    onTapHold: string;
    tappingTerm: number;
}

// TAPDANCEマクロの解析
export function parseTapDanceEntries(
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

export function generateTapDanceEntries(entries: TapDanceEntry[]): string {
    let output = '';
    // Tap Dance定義の生成
    if (entries && entries.length > 0) {
        output += "\n// Tap Dance definitions\n";
        output += `#define TAP_DANCE_ENTRY(onTap, onHold, onDoubleTap, onTapHold, tappingTerm) ((vial_tap_dance_entry_t){.on_tap = onTap, .on_hold = onHold, .on_double_tap = onDoubleTap, .on_tap_hold = onTapHold, .custom_tapping_term = tappingTerm})\n`;
        output += `#if VIAL_TAP_DANCE_ENTRIES > 0\n`;
        output += "const vial_tap_dance_entry_t default_tap_dance_entries[] = {\n";
        entries.forEach((entry, index) => {
            output += `    TAP_DANCE_ENTRY(${entry.onTap}, ${entry.onHold}, ${entry.onDoubleTap}, ${entry.onTapHold}, ${entry.tappingTerm})`;
            if (index < entries.length - 1) {
                output += ",";
            }
            output += "\n";
        });
        output += "};\n";
        output += `#endif\n`;
    }
    return output;
}