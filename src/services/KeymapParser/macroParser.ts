export type MacroEntry = string;

export function parseMacroEntries(
  content: string,
  entryCount: number
): MacroEntry[] {
  const entries: MacroEntry[] = Array.from(
    { length: entryCount },
    () => ""
  );

  // macro定義を探す
  const macroMatch = content.match(
    /const\s+char\*\s+(?:PROGMEM\s+)?default_macro_entries\[\]\s*=\s*\{([\s\S]*?)\};/
  );
  if (!macroMatch) return entries;

  // マクロエントリをパース
  const macroContent = macroMatch[1].trim();
  const macroEntries = macroContent.split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/);

  
  macroEntries.forEach((entry, index) => {
    // Remove surrounding quotes
    entry = entry.replace(/^"(.*)"$/, "$1");
    if (index >= entryCount) return;
    entries[index] = entry.trim();
  });

  return entries;
}

export function generateMacroEntries(entries: MacroEntry[]): string {
  let output = "";
  if (entries && entries.length > 0) {
    output += "\n// Macro definitions\n";
    output += "const char* default_macro_entries[] = {\n";
    entries.forEach((entry, index) => {
      output += `    "${entry}"`;
      if (index < entries.length - 1) {
        output += ",";
      }
      output += "\n";
    });
    output += "};\n";
  }
  return output;
}