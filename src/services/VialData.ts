import { DefaultQmkKeycode, KeycodeConverter, QmkKeycode } from "../components/keycodes/keycodeConverter";
import { DynamicEntryCount, IVialData } from "./IVialData";
import { QmkKeymap } from "./KeymapParser/keymap-c";

export type CustomKeycode = {
  name: string;
  title: string;
  shortName: string;
};

export class VialData implements IVialData {
  private _keymap: QmkKeymap;
  private qmkKeycodes: { [key: string]: QmkKeycode } = {};
  private keycodeConverter: KeycodeConverter | undefined = undefined;

  get keymap() {
    return this._keymap;
  }

  constructor(keymap: QmkKeymap) {
    this._keymap = keymap;
  }
  async initKeycodeTable(customKeycodes?: CustomKeycode[]): Promise<void> {
    this.keycodeConverter = await KeycodeConverter.Create(
      this.keymap.layers.length,
      customKeycodes,
      32,
      this._keymap.tapDanceEntries.length
    );
    for (let k = 0; k < 0xffff; k++) {
      const key = this.keycodeConverter.convertIntToKeycode(k);
      this.qmkKeycodes[key.key] = key;
      this.qmkKeycodes[key.label] = key;
      key.aliases?.forEach((alias) => {
        this.qmkKeycodes[alias] = key;
      });
      this.qmkKeycodes[`Any(${k})`] = key;
    }
  }

  async GetProtocolVersion(): Promise<number> {
    return 0;
  }

  async GetLayoutOption(): Promise<number> {
    return 0;
  }

  async SetLayoutOption(_layout: number): Promise<number> {
    return 0;
  }

  async GetVialKeyboardId(): Promise<{ vialProtocol: number; uid: bigint }> {
    return { vialProtocol: 0, uid: BigInt(0) };
  }

  async GetVialCompressedDefinition(): Promise<Uint8Array> {
    return new Uint8Array();
  }

  async GetLayerCount(): Promise<number> {
    return this.keymap.layers.length;
  }

  async GetLayer(
    layer: number,
    matrix_definition: { rows: number; cols: number }
  ): Promise<number[]> {
    const keymap = this._keymap.layers[layer].keys.map((key) => ({
      keycode: this.qmkKeycodes[key.key] ?? DefaultQmkKeycode,
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
    if (!this.keycodeConverter) {
      throw new Error("KeycodeConverter is not initialized");
    }
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
    return this._keymap.encoderEntries[layer]
      .slice(0, count)
      .map((entry) => [
        this.qmkKeycodes[entry.ccw]?.value ?? 0,
        this.qmkKeycodes[entry.cw]?.value ?? 0,
      ]);
  }

  async SetEncoder(
    values: {
      layer: number;
      index: number;
      direction: number;
      keycode: number;
    }[]
  ): Promise<void> {
    if (!this.keycodeConverter) {
      throw new Error("KeycodeConverter is not initialized");
    }
    values.forEach((value) => {
      const qk = this.keycodeConverter!.convertIntToKeycode(value.keycode);
      if (value.direction === 0) {
        this._keymap.encoderEntries[value.layer][value.index].ccw = qk.key;
      } else {
        this._keymap.encoderEntries[value.layer][value.index].cw = qk.key;
      }
    });
  }

  async GetDynamicEntryCount(): Promise<{
    tapdance: number;
    combo: number;
    override: number;
  }> {
    return {
      tapdance: this.keymap.tapDanceEntries.length,
      combo: this.keymap.comboEntries.length,
      override: this.keymap.keyOverrideEntries.length,
    };
  }

  async GetDynamicEntryCountAll(): Promise<DynamicEntryCount> {
    return {
      layer: this.keymap.layers.length,
      macro: this.keymap.macroEntries.length,
      tapdance: this.keymap.tapDanceEntries.length,
      combo: this.keymap.comboEntries.length,
      override: this.keymap.keyOverrideEntries.length,
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
    if (this.keycodeConverter) {
      throw new Error("KeycodeConverter is not initialized");
    }
    values.forEach((value) => {
      this._keymap.tapDanceEntries[value.id] = {
        onTap: this.keycodeConverter!.convertIntToKeycode(value.onTap).key,
        onHold: this.keycodeConverter!.convertIntToKeycode(value.onHold).key,
        onDoubleTap: this.keycodeConverter!.convertIntToKeycode(
          value.onDoubleTap
        ).key,
        onTapHold: this.keycodeConverter!.convertIntToKeycode(value.onTapHold)
          .key,
        tappingTerm: value.tappingTerm,
      };
    });
  }

  async GetMacroCount(): Promise<number> {
    let count = 0;
    let i = 0;

    while (i < this.keymap.macroEntries.length) {
      const entry = this.keymap.macroEntries[i];

      if (entry === 0) {
        count++;
      } else if (entry === 1) {
        // アクションの場合、次のバイトを見て適切にスキップ
        const actionType = this.keymap.macroEntries[i + 1];
        if (actionType === 4 || (actionType >= 5 && actionType <= 7)) {
          i += 3; // [1, type, value, value]
        } else if (actionType >= 1 && actionType <= 3) {
          i += 2; // [1, type, value]
        }
      }
      i++;
    }

    return Math.min(count, 32);
  }

  async GetMacroBufferLen(): Promise<number> {
    return this.keymap.macroEntries.length;
  }

  async GetMacroBuffer(offset: number, length: number): Promise<number[]> {
    if (offset + length > this.keymap.macroEntries.length) {
      const result = new Array(length).fill(0);
      result.splice(
        0,
        this.keymap.macroEntries.length - offset,
        ...this.keymap.macroEntries.slice(offset)
      );
      return result;
    }
    return this.keymap.macroEntries.slice(offset, offset + length);
  }

  async GetMacros(macroCount: number): Promise<number[][]> {
    const macros: number[][] = [];
    let currentMacro: number[] = [];
    let i = 0;

    while (i < this.keymap.macroEntries.length && macros.length < macroCount) {
      const entry = this.keymap.macroEntries[i];

      if (entry === 0 && currentMacro.length > 0) {
        // 純粋な区切り文字としての0の場合
        macros.push(currentMacro);
        currentMacro = [];
      } else if (entry === 1) {
        // アクションの場合、次のバイトを見て処理
        const actionType = this.keymap.macroEntries[i + 1];
        if (actionType === 4) {
          // Delay action: [1, 4, value, value]
          currentMacro.push(entry);
          currentMacro.push(this.keymap.macroEntries[i + 1]);
          currentMacro.push(this.keymap.macroEntries[i + 2]);
          currentMacro.push(this.keymap.macroEntries[i + 3]);
          i += 3;
        } else if (actionType >= 5 && actionType <= 7) {
          // Extended keycode action: [1, type, keycode_low, keycode_high]
          currentMacro.push(entry);
          currentMacro.push(this.keymap.macroEntries[i + 1]);
          currentMacro.push(this.keymap.macroEntries[i + 2]);
          currentMacro.push(this.keymap.macroEntries[i + 3]);
          i += 3;
        } else if (actionType >= 1 && actionType <= 3) {
          // Basic keycode action: [1, type, keycode]
          currentMacro.push(entry);
          currentMacro.push(this.keymap.macroEntries[i + 1]);
          currentMacro.push(this.keymap.macroEntries[i + 2]);
          i += 2;
        }
      } else {
        // 通常の文字の場合
        currentMacro.push(entry);
      }
      i++;
    }

    if (currentMacro.length > 0) {
      macros.push(currentMacro);
    }

    return macros;
  }

  async SetMacroBuffer(offset: number, data: number[]): Promise<void> {
    this.keymap.macroEntries.splice(offset, data.length, ...data);
  }

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
    if (!this.keycodeConverter) {
      throw new Error("KeycodeConverter is not initialized");
    }
    values.forEach((value) => {
      this._keymap.comboEntries[value.id] = {
        key1: this.keycodeConverter!.convertIntToKeycode(value.key1).key,
        key2: this.keycodeConverter!.convertIntToKeycode(value.key2).key,
        key3: this.keycodeConverter!.convertIntToKeycode(value.key3).key,
        key4: this.keycodeConverter!.convertIntToKeycode(value.key4).key,
        output: this.keycodeConverter!.convertIntToKeycode(value.output).key,
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
    if (!this.keycodeConverter) {
      throw new Error("KeycodeConverter is not initialized");
    }

    return ids
      .filter((id) => id < this._keymap.keyOverrideEntries.length)
      .map((id) => ({
        trigger:
          this.qmkKeycodes[this._keymap.keyOverrideEntries[id].trigger].value ??
          0,
        replacement:
          this.qmkKeycodes[this._keymap.keyOverrideEntries[id].replacement]
            .value ?? 0,
        layers: this._keymap.keyOverrideEntries[id].layers,
        triggerMods: this._keymap.keyOverrideEntries[id].triggerMods,
        negativeModMask: this._keymap.keyOverrideEntries[id].negativeModMask,
        suppressedMods: this._keymap.keyOverrideEntries[id].suppressedMods,
        options: this._keymap.keyOverrideEntries[id].options,
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
  ): Promise<void> {
    if (!this.keycodeConverter) {
      throw new Error("KeycodeConverter is not initialized");
    }

    values.forEach((value) => {
      if (value.id >= this._keymap.keyOverrideEntries.length) {
        return;
      }
      this._keymap.keyOverrideEntries[value.id] = {
        trigger: this.keycodeConverter!.convertIntToKeycode(value.trigger).key,
        replacement: this.keycodeConverter!.convertIntToKeycode(
          value.replacement
        ).key,
        layers: value.layers,
        triggerMods: value.triggerMods,
        negativeModMask: value.negativeModMask,
        suppressedMods: value.suppressedMods,
        options: value.options,
      };
    });
  }

  async GetQuantumSettingsValue(
    id: string[]
  ): Promise<{ [id: string]: number }> {
    return id.reduce((acc, id) => {
      const setting = this.keymap.quantumSettings[id];
      return { ...acc, [id]: setting };
    }, {});
  }

  async SetQuantumSettingsValue(value: {
    [id: string]: number | undefined;
  }): Promise<void> {
    Object.entries(value).forEach(([key, value]) => {
      if (value === undefined) {
        delete this.keymap.quantumSettings[key];
      } else {
        this.keymap.quantumSettings[key] = value;
      }
    });
  }

  async EraseQuantumSettingsValue(): Promise<void> {}

  async GetCustomValue(id: number[][]): Promise<number[]> {
    return id.map(() => 0);
  }

  async SetCustomValue(_id: number[], _value: number): Promise<void> {}

  async SaveCustomValue(_id: number[]): Promise<void> {}

  async ResetEeprom(): Promise<void> {}

  GetHidName(): string {
    return "Dummy Keyboard";
  }
}