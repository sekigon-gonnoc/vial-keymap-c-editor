import { DynamicEntryCount, IVialData } from "./IVialData";

export class VialData implements IVialData {
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
        return 4;
    }

    async GetLayer(layer: number, matrix_definition: { rows: number; cols: number }): Promise<number[]> {
        return new Array(matrix_definition.rows * matrix_definition.cols).fill(0);
    }

    async SetLayer(layer: number, keycodes: number[], matrix_definition: { rows: number; cols: number }): Promise<void> {
    }

    async SetKeycode(layer: number, row: number, col: number, keycode: number): Promise<void> {
    }

    async GetEncoder(layer: number, count: number): Promise<number[][]> {
        return Array(count).fill([0, 0]);
    }

    async SetEncoder(values: { layer: number; index: number; direction: number; keycode: number; }[]): Promise<void> {
    }

    async GetDynamicEntryCount(): Promise<{ tapdance: number; combo: number; override: number; }> {
        return { tapdance: 0, combo: 0, override: 0 };
    }

    async GetDynamicEntryCountAll(): Promise<DynamicEntryCount> {
        return { layer: 0, macro: 0, tapdance: 0, combo: 0, override: 0 };
    }

    async GetTapDance(ids: number[]): Promise<{ onTap: number; onHold: number; onDoubleTap: number; onTapHold: number; tappingTerm: number; }[]> {
        return ids.map(() => ({ onTap: 0, onHold: 0, onDoubleTap: 0, onTapHold: 0, tappingTerm: 0 }));
    }

    async SetTapDance(values: { id: number; onTap: number; onHold: number; onDoubleTap: number; onTapHold: number; tappingTerm: number; }[]): Promise<void> {
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

    async SetMacroBuffer(offset: number, data: number[]): Promise<void> {
    }

    async GetCombo(ids: number[]): Promise<{ key1: number; key2: number; key3: number; key4: number; output: number; }[]> {
        return ids.map(() => ({ key1: 0, key2: 0, key3: 0, key4: 0, output: 0 }));
    }

    async SetCombo(values: { id: number; key1: number; key2: number; key3: number; key4: number; output: number; }[]): Promise<void> {
    }

    async GetOverride(ids: number[]): Promise<{ trigger: number; replacement: number; layers: number; triggerMods: number; negativeModMask: number; suppressedMods: number; options: number; }[]> {
        return ids.map(() => ({ trigger: 0, replacement: 0, layers: 0, triggerMods: 0, negativeModMask: 0, suppressedMods: 0, options: 0 }));
    }

    async SetOverride(values: { id: number; trigger: number; replacement: number; layers: number; triggerMods: number; negativeModMask: number; suppressedMods: number; options: number; }[]): Promise<void> {
    }

    async GetQuantumSettingsValue(id: number[]): Promise<{ [id: number]: number }> {
        return {};
    }

    async SetQuantumSettingsValue(value: { [id: number]: number }): Promise<void> {
    }

    async EraseQuantumSettingsValue(): Promise<void> {
    }

    async GetCustomValue(id: number[][]): Promise<number[]> {
        return id.map(() => 0);
    }

    async SetCustomValue(id: number[], value: number): Promise<void> {
    }

    async SaveCustomValue(id: number[]): Promise<void> {
    }

    async ResetEeprom(): Promise<void> {
    }

    GetHidName(): string {
        return "Dummy Keyboard";
    }
}