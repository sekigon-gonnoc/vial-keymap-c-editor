import { DefaultQmkKeycode, KeycodeConverter, QmkKeycode } from "../components/keycodes/keycodeConverter";
import { DynamicEntryCount, IVialData } from "./IVialData";
import { QmkKeymap } from "./keymap-c";

export type CustomKeycode = {
  name: string;
  title: string;
  shortName: string;
};

export class VialData implements IVialData {
  private _keymap: QmkKeymap;
  private qmkKeycodes: { [key: string]: QmkKeycode } = {};
  private keycodeConverter: KeycodeConverter;

  get keymap() {
    return this._keymap;
  }

  constructor(keymap: QmkKeymap) {
    this._keymap = keymap;
  }
  async initKeycodeTable(customKeycodes?: CustomKeycode[]): Promise<void> {
    this.keycodeConverter = await KeycodeConverter.Create(
      this.keymap.dynamicLayerCount,
      customKeycodes
    );
    for (let k = 0; k < 0xffff; k++) {
      const key = this.keycodeConverter.convertIntToKeycode(k);
      this.qmkKeycodes[key.key] = key;
      this.qmkKeycodes[key.label] = key;
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
    return this.keymap.dynamicLayerCount;
  }

  async GetLayer(
    layer: number,
    matrix_definition: { rows: number; cols: number }
  ): Promise<number[]> {
    const keymap = this._keymap.layers[layer].keys.map((key) => ({
      keycode: this.qmkKeycodes[key.keycode] ?? DefaultQmkKeycode,
      matrix: key.matrix,
    }));
    const result: number[] = new Array(
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
    this._keymap.layers[layer].keys = keymap.map((key) => ({
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
    const index = this._keymap.layers[layer].keys.findIndex(
      (key) => key.matrix[0] === row && key.matrix[1] === col
    );
    if (index >= 0) {
      this._keymap.layers[layer].keys[index].keycode = qk.key;
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
    return {
      tapdance: this.keymap.tapDanceEntries.length,
      combo: this.keymap.comboEntries.length,
      override: this.keymap.dynamicOverrideCount,
    };
  }

  async GetDynamicEntryCountAll(): Promise<DynamicEntryCount> {
    return {
      layer: this.keymap.dynamicLayerCount,
      macro: this.keymap.dynamicMacroCount,
      tapdance: this.keymap.tapDanceEntries.length,
      combo: this.keymap.comboEntries.length,
      override: this.keymap.dynamicOverrideCount,
    };
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
    return ids.map((id) => {
      const entry = this._keymap.tapDanceEntries[id];
      if (!entry) {
        return {
          onTap: 0,
          onHold: 0,
          onDoubleTap: 0,
          onTapHold: 0,
          tappingTerm: 0,
        };
      }
      return {
        onTap: this.qmkKeycodes[entry.onTap]?.value ?? 0,
        onHold: this.qmkKeycodes[entry.onHold]?.value ?? 0,
        onDoubleTap: this.qmkKeycodes[entry.onDoubleTap]?.value ?? 0,
        onTapHold: this.qmkKeycodes[entry.onTapHold]?.value ?? 0,
        tappingTerm: entry.tappingTerm,
      };
    });
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
  ): Promise<void> {
    values.forEach((value) => {
      this._keymap.tapDanceEntries[value.id] = {
        onTap: this.keycodeConverter.convertIntToKeycode(value.onTap).key,
        onHold: this.keycodeConverter.convertIntToKeycode(value.onHold).key,
        onDoubleTap: this.keycodeConverter.convertIntToKeycode(value.onDoubleTap).key,
        onTapHold: this.keycodeConverter.convertIntToKeycode(value.onTapHold).key,
        tappingTerm: value.tappingTerm,
      };
    });
  }

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
    return ids.map((id) => {
      const entry = this._keymap.comboEntries[id];
      if (!entry) {
        return { key1: 0, key2: 0, key3: 0, key4: 0, output: 0 };
      }
      return {
        key1: this.qmkKeycodes[entry.key1]?.value ?? 0,
        key2: this.qmkKeycodes[entry.key2]?.value ?? 0,
        key3: this.qmkKeycodes[entry.key3]?.value ?? 0,
        key4: this.qmkKeycodes[entry.key4]?.value ?? 0,
        output: this.qmkKeycodes[entry.output]?.value ?? 0,
      };
    });
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
  ): Promise<void> {
    values.forEach((value) => {
      this._keymap.comboEntries[value.id] = {
        key1: this.keycodeConverter.convertIntToKeycode(value.key1).key,
        key2: this.keycodeConverter.convertIntToKeycode(value.key2).key,
        key3: this.keycodeConverter.convertIntToKeycode(value.key3).key,
        key4: this.keycodeConverter.convertIntToKeycode(value.key4).key,
        output: this.keycodeConverter.convertIntToKeycode(value.output).key,
      };
    });
  }

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