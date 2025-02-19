export interface DynamicEntryCount {
  layer: number;
  macro: number;
  tapdance: number;
  combo: number;
  override: number;
}

export interface IVialData {
  GetProtocolVersion(): Promise<number>;
  GetLayoutOption(): Promise<number>;
  SetLayoutOption(layout: number): Promise<number>;
  GetVialKeyboardId(): Promise<{ vialProtocol: number; uid: bigint }>;
  GetVialCompressedDefinition(): Promise<Uint8Array>;
  GetLayerCount(): Promise<number>;
  GetLayer(layer: number, matrix_definition: { rows: number; cols: number }): Promise<number[]>;
  SetLayer(layer: number, keycodes: number[], matrix_definition: { rows: number; cols: number }): Promise<void>;
  SetKeycode(layer: number, row: number, col: number, keycode: number): Promise<void>;
  GetEncoder(layer: number, count: number): Promise<number[][]>;
  SetEncoder(values: { layer: number; index: number; direction: number; keycode: number }[]): Promise<void>;
  GetDynamicEntryCount(): Promise<{ tapdance: number; combo: number; override: number }>;
  GetDynamicEntryCountAll(): Promise<DynamicEntryCount>;
  GetTapDance(ids: number[]): Promise<{
    onTap: number;
    onHold: number;
    onDoubleTap: number;
    onTapHold: number;
    tappingTerm: number;
  }[]>;
  SetTapDance(values: {
    id: number;
    onTap: number;
    onHold: number;
    onDoubleTap: number;
    onTapHold: number;
    tappingTerm: number;
  }[]): Promise<void>;
  GetMacroCount(): Promise<number>;
  GetMacroBufferLen(): Promise<number>;
  GetMacroBuffer(offset: number, length: number): Promise<number[]>;
  GetMacros(macroCount: number): Promise<number[][]>;
  SetMacroBuffer(offset: number, data: number[]): Promise<void>;
  GetCombo(ids: number[]): Promise<{
    key1: number;
    key2: number;
    key3: number;
    key4: number;
    output: number;
  }[]>;
  SetCombo(values: {
    id: number;
    key1: number;
    key2: number;
    key3: number;
    key4: number;
    output: number;
  }[]): Promise<void>;
  GetOverride(ids: number[]): Promise<{
    trigger: number;
    replacement: number;
    layers: number;
    triggerMods: number;
    negativeModMask: number;
    suppressedMods: number;
    options: number;
  }[]>;
  SetOverride(values: {
    id: number;
    trigger: number;
    replacement: number;
    layers: number;
    triggerMods: number;
    negativeModMask: number;
    suppressedMods: number;
    options: number;
  }[]): Promise<void>;
  GetQuantumSettingsValue(id: string[]): Promise<{ [id: string]: number }>;
  SetQuantumSettingsValue(value: { [id: number]: number | undefined }): Promise<void>;
  EraseQuantumSettingsValue(): Promise<void>;
  GetCustomValue(id: number[][]): Promise<number[]>;
  SetCustomValue(id: number[], value: number): Promise<void>;
  SaveCustomValue(id: number[]): Promise<void>;
  ResetEeprom(): Promise<void>;
  GetHidName(): string;
}