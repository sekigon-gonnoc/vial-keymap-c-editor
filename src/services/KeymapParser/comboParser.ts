export interface ComboEntry {
    key1: string;
    key2: string;
    key3: string;
    key4: string;
    output: string;
}

// Comboマクロの解析
export function parseComboEntries(
  content: string,
  entryCount: number
): ComboEntry[] {
  const defaultComboEntry: ComboEntry = {
    key1: "KC_NO",
    key2: "KC_NO",
    key3: "KC_NO",
    key4: "KC_NO",
    output: "KC_NO",
  };
  const entries: ComboEntry[] = Array.from(
    { length: entryCount },
    () => ({ ...defaultComboEntry })
  );

  // combo定義を探す
  const comboMatch = content.match(
    /const\s+vial_combo_entry_t\s+(?:PROGMEM\s+)?default_combo_entries\[\]\s*=\s*\{([\s\S]*?)\};/
  );
  if (!comboMatch) return entries;

  // COMBO_ENTRYマクロを探す
  const entryRegex =
    /COMBO_ENTRY\s*\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*,\s*([^,]+)\s*\)/g;
  const entriesStr = comboMatch[1];

  let match;
  let index = 0;
  while ((match = entryRegex.exec(entriesStr)) !== null && index < entryCount) {
    entries[index] = {
      key1: match[1].trim(),
      key2: match[2].trim(),
      key3: match[3].trim(),
      key4: match[4].trim(),
      output: match[5].trim(),
    };
    index++;
  }

  return entries;
}

export function changeComboCount(
  entries: ComboEntry[],
  newCount: number
): ComboEntry[] {
  if (newCount === entries.length || newCount < 0 || newCount > 32) {
    return entries;
  }
  const defaultEntry: ComboEntry = {
    key1: "KC_NO",
    key2: "KC_NO",
    key3: "KC_NO",
    key4: "KC_NO",
    output: "KC_NO",
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


export function generateComboEntries(entries: ComboEntry[]): string {
  let output = "";
  // Combo定義の生成
  output += "\n// Combo definitions\n";
  output += `#define COMBO_ENTRY(k1, k2, k3, k4, result) ((vial_combo_entry_t){.input ={k1, k2, k3, k4}, .output = result})\n`;
  output += `#if VIAL_COMBO_ENTRIES > 0\n`;
  output += "const vial_combo_entry_t PROGMEM default_combo_entries[] = {\n";
  entries.forEach((entry, index) => {
    output += `    COMBO_ENTRY(${entry.key1}, ${entry.key2}, ${entry.key3}, ${entry.key4}, ${entry.output})`;
    if (index < entries.length - 1) {
      output += ",";
    }
    output += "\n";
  });
  output += "};\n";
  output += `#endif\n`;
  return output;
}