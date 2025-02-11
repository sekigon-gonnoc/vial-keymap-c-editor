import { DefaultQmkKeycode, KeycodeConverter, QmkKeycode } from "../components/keycodes/keycodeConverter";
import { DynamicEntryCount, IVialData } from "./IVialData";
import { QmkKeymap } from "./keymap-c";

export class VialData implements IVialData {
  private keymap: QmkKeymap;
  private layerCount: number;
  private qmkKeycodes: { [key: string]: QmkKeycode } = {};
  private keycodeConverter: KeycodeConverter;
  constructor(keymap: QmkKeymap, layerCount: number) {
    this.keymap = keymap;
    this.layerCount = layerCount;
  }
  async initKeycodeTable() {
    this.keycodeConverter = await KeycodeConverter.Create(this.layerCount);
    for (let k = 0; k < 0xffff; k++) {
      const key = this.keycodeConverter.convertIntToKeycode(k);
      this.qmkKeycodes[key.key] = key;
      key.aliases?.forEach((alias) => {
        this.qmkKeycodes[alias] = key;
      });
    }
  }

  async GetProtocolVersion(): Promise<number> {
    return 0;
  }

  async GetLayoutOption(): Promise<number> {
    return 0;
  }

  async SetLayoutOption(layout: number): Promise<number> {
    return 0;
  }

  async GetVialKeyboardId(): Promise<{ vialProtocol: number; uid: bigint }> {
    return { vialProtocol: 0, uid: BigInt(0) };
  }

  async GetVialCompressedDefinition(): Promise<Uint8Array> {
    return new Uint8Array();
  }

  async GetLayerCount(): Promise<number> {
    return this.layerCount;
  }

  async GetLayer(
    layer: number,
    matrix_definition: { rows: number; cols: number }
  ): Promise<number[]> {
    const keymap = this.keymap.layers[layer].keys.map((key) => ({
      keycode: this.qmkKeycodes[key.keycode] ?? DefaultQmkKeycode,
      matrix: key.matrix,
    }));
    const result : number[]= new Array(
      matrix_definition.rows * matrix_definition.cols
    ).fill(0);
    keymap.forEach((key) => {
      if (key.matrix[0] >= 0 && key.matrix[1] >= 0) {
        result[key.matrix[0] * matrix_definition.cols + key.matrix[1]] =
          key.keycode.value;
      }
    });
    return result;
  }

  async SetLayer(
    layer: number,
    keycodes: number[],
    matrix_definition: { rows: number; cols: number }
  ): Promise<void> {
    const keymap = keycodes.map((keycode, index) => ({
      keycode: this.qmkKeycodes[keycode] ?? DefaultQmkKeycode,
      matrix: [
        Math.floor(index / matrix_definition.cols),
        index % matrix_definition.cols,
      ],
    }));
    this.keymap.layers[layer].keys = keymap.map((key) => ({
      keycode: key.keycode.key,
      matrix: key.matrix,
    }));
  }

  async SetKeycode(
    layer: number,
    row: number,
    col: number,
    keycode: number
  ): Promise<void> {
    const qk = this.keycodeConverter.convertIntToKeycode(keycode);
    const index = this.keymap.layers[layer].keys.findIndex(
      (key) => key.matrix[0] === row && key.matrix[1] === col
    );
    if (index >= 0) {
      this.keymap.layers[layer].keys[index].keycode = qk.key;
    } else {
      console.error(`Key not found at ${row}, ${col}`);
    }
  }

  async GetEncoder(layer: number, count: number): Promise<number[][]> {
    return Array(count).fill([0, 0]);
  }

  async SetEncoder(
    values: {
      layer: number;
      index: number;
      direction: number;
      keycode: number;
    }[]
  ): Promise<void> {}

  async GetDynamicEntryCount(): Promise<{
    tapdance: number;
    combo: number;
    override: number;
  }> {
    return { tapdance: 0, combo: 0, override: 0 };
  }

  async GetDynamicEntryCountAll(): Promise<DynamicEntryCount> {
    return { layer: 0, macro: 0, tapdance: 0, combo: 0, override: 0 };
  }

  async GetTapDance(ids: number[]): Promise<
    {
      onTap: number;
      onHold: number;
      onDoubleTap: number;
      onTapHold: number;
      tappingTerm: number;
    }[]
  > {
    return ids.map(() => ({
      onTap: 0,
      onHold: 0,
      onDoubleTap: 0,
      onTapHold: 0,
      tappingTerm: 0,
    }));
  }

  async SetTapDance(
    values: {
      id: number;
      onTap: number;
      onHold: number;
      onDoubleTap: number;
      onTapHold: number;
      tappingTerm: number;
    }[]
  ): Promise<void> {}

  async GetMacroCount(): Promise<number> {
    return 0;
  }

  async GetMacroBufferLen(): Promise<number> {
    return 0;
  }

  async GetMacroBuffer(offset: number, length: number): Promise<number[]> {
    return new Array(length).fill(0);
  }

  async GetMacros(macroCount: number): Promise<number[][]> {
    return Array(macroCount).fill([]);
  }

  async SetMacroBuffer(offset: number, data: number[]): Promise<void> {}

  async GetCombo(
    ids: number[]
  ): Promise<
    { key1: number; key2: number; key3: number; key4: number; output: number }[]
  > {
    return ids.map(() => ({ key1: 0, key2: 0, key3: 0, key4: 0, output: 0 }));
  }

  async SetCombo(
    values: {
      id: number;
      key1: number;
      key2: number;
      key3: number;
      key4: number;
      output: number;
    }[]
  ): Promise<void> {}

  async GetOverride(ids: number[]): Promise<
    {
      trigger: number;
      replacement: number;
      layers: number;
      triggerMods: number;
      negativeModMask: number;
      suppressedMods: number;
      options: number;
    }[]
  > {
    return ids.map(() => ({
      trigger: 0,
      replacement: 0,
      layers: 0,
      triggerMods: 0,
      negativeModMask: 0,
      suppressedMods: 0,
      options: 0,
    }));
  }

  async SetOverride(
    values: {
      id: number;
      trigger: number;
      replacement: number;
      layers: number;
      triggerMods: number;
      negativeModMask: number;
      suppressedMods: number;
      options: number;
    }[]
  ): Promise<void> {}

  async GetQuantumSettingsValue(
    id: number[]
  ): Promise<{ [id: number]: number }> {
    return {};
  }

  async SetQuantumSettingsValue(value: {
    [id: number]: number;
  }): Promise<void> {}

  async EraseQuantumSettingsValue(): Promise<void> {}

  async GetCustomValue(id: number[][]): Promise<number[]> {
    return id.map(() => 0);
  }

  async SetCustomValue(id: number[], value: number): Promise<void> {}

  async SaveCustomValue(id: number[]): Promise<void> {}

  async ResetEeprom(): Promise<void> {}

  GetHidName(): string {
    return "Dummy Keyboard";
  }
}