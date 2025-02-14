import {
  Button,
  IconButton,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  Switch,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { useEffect, useState } from "react";
import {
  DefaultQmkKeycode,
  KeycodeConverter,
  ModifierBit,
} from "../keycodes/keycodeConverter";
import { KeymapKeyProperties, KeymapProperties } from "./KeymapTypes";
import { DynamicEntryCount, IVialData } from "../../services/IVialData";
import { KeymapLayer } from "./KeyComponents";
import { convertToKeymapKeys } from "./converToKeymapKeys";

function LayoutSelector(props: {
  via: IVialData;
  layouts: {
    labels?: string[][];
  };
  option: { [layout: number]: number };
  onChange: (option: { [layout: number]: number }) => void;
}) {
  return (
    <FormControl variant="standard">
      <Select
        value={props.option[0]}
        label="layout"
        onChange={(event) =>
          props.onChange({ 0: event.target.value } as {
            [layout: number]: number;
          })
        }
      >
        {props.layouts.labels?.[0]?.slice(1).map((label, index) => (
          <MenuItem key={label} value={index}>
            {label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function LayerSelector(props: { 
  layerCount: number; 
  currentLayer?: number;
  onChange: (layer: number) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "4px" }}>
      {[...Array(props.layerCount)].map((_, idx) => {
        const isActive = idx === props.currentLayer;
        return (
          <Button
            key={idx}
            value={idx}
            variant={isActive ? "contained" : "outlined"}
            size="small"
            sx={{
              minWidth: "32px",
              width: "32px",
              height: "32px",
              padding: 0,
              borderRadius: "50%",
            }}
            onClick={() => {
              props.onChange(idx);
            }}
          >
            {idx}
          </Button>
        );
      })}
    </div>
  );
}

export function LayerEditor(props: {
  keymap: KeymapProperties;
  via: IVialData;
  layerCount: number;
  keycodeConverter: KeycodeConverter;
  dynamicEntryCount: { tapdance: number };
  onTapdanceSelect?: (index: number) => void;
  onMacroSelect?: (index: number) => void;
  onDynamicEntryCountChange: (count: DynamicEntryCount) => void;
}) {
  const [layoutOption, setLayoutOption] = useState<{
    [layout: number]: number;
  }>({ 0: 0 });
  const [layer, setLayer] = useState(0);
  const [keymap, setKeymap] = useState<{ [layer: number]: number[] }>({});
  const [encoderCount, setEncoderCount] = useState(0);
  const [encodermap, setEncodermap] = useState<{ [layer: number]: number[][] }>(
    {}
  );
  const [captureMode, setCaptureMode] = useState(false);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(-1);
  const [activeModifiers, setActiveModifiers] = useState<Set<number>>(
    new Set()
  );
  const [modifierOnlyPress, setModifierOnlyPress] = useState(false);

  useEffect(() => {
    navigator.locks.request("load-layout", async () => {
      const layout = await props.via.GetLayoutOption();
      setLayoutOption({ 0: layout });
      setLayer(0);

      const layerKeys = await props.via.GetLayer(0, {
        rows: props.keymap.matrix.rows,
        cols: props.keymap.matrix.cols,
      });
      setKeymap({ 0: layerKeys });

      const encoderCount = props.keymap.layouts.keymap
        .flatMap((row) => row.flatMap((col) => col.toString()))
        .reduce(
          (acc, key) =>
            Math.max(
              acc,
              key.endsWith("e") ? parseInt(key.split(",")[0]) + 1 : acc
            ),
          0
        );
      setEncoderCount(encoderCount);
      setEncodermap({ 0: await props.via.GetEncoder(0, encoderCount) });
    });
  }, [props.keymap, props.via]);

  const sendKeycode = async (
    layer: number,
    row: number,
    col: number,
    keycode: number
  ) => {
    await props.via.SetKeycode(layer, row, col, keycode);
  };

  const sendEncoder = async (
    layer: number,
    index: number,
    direction: number,
    keycode: number
  ) => {
    await props.via.SetEncoder([{ layer, index, direction, keycode }]);
  };

  const sendLayout = async (layout: number) => {
    await props.via.SetLayoutOption(layout);
  };

  const isModifierEvent = (event: KeyboardEvent): boolean => {
    return (
      event.key === "Control" ||
      event.key === "Shift" ||
      event.key === "Alt" ||
      event.key === "Meta"
    ); // Windows key/Command key
  };

  // matrix順にソートする関数を追加
  const sortByMatrix = (keys: KeymapKeyProperties[]) => {
    return [...keys].sort((a, b) => {
      // まず行を比較
      if (a.matrix[0] !== b.matrix[0]) {
        return a.matrix[0] - b.matrix[0];
      }
      // 同じ行なら列を比較
      return a.matrix[1] - b.matrix[1];
    });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!captureMode) return;

      event.preventDefault();

      // 修飾キーの場合は状態を記録して終了
      if (isModifierEvent(event)) {
        const modValue =
          event.key === "Control"
            ? ModifierBit.Ctrl
            : event.key === "Shift"
            ? ModifierBit.Shift
            : event.key === "Alt"
            ? ModifierBit.Alt
            : event.key === "Meta"
            ? ModifierBit.GUI
            : 0;

        if (modValue !== 0) {
          const finalModValue =
            event.location === 2 ? modValue | ModifierBit.UseRight : modValue;

          setActiveModifiers((prev) => new Set([...prev, finalModValue]));
          setModifierOnlyPress(true);
        }
        return;
      }

      // 修飾キー以外のキーが押されていたらmodifierOnlyPressをfalseに
      setModifierOnlyPress(false);

      const keycode = props.keycodeConverter.convertKeyEventToKeycode(event);
      if (!keycode) return;

      const keys = convertToKeymapKeys(
        props.keymap,
        layoutOption,
        keymap[layer],
        encodermap[layer] ?? [[]],
        props.keycodeConverter
      );

      // matrix順にソートしたキーリストを取得
      const sortedKeys = sortByMatrix(keys.filter((k) => !k.isEncoder));

      // 最初のキー選択
      if (currentKeyIndex === -1) {
        if (sortedKeys.length > 0) {
          // matrix順の最初のキーのインデックスを探す
          const firstKey = sortedKeys[0];
          const originalIndex = keys.findIndex(
            (k) =>
              k.matrix[0] === firstKey.matrix[0] &&
              k.matrix[1] === firstKey.matrix[1]
          );
          setCurrentKeyIndex(originalIndex);
        }
        return;
      }

      const currentKey = keys[currentKeyIndex];
      if (currentKey) {
        // 修飾キーが押されている場合は組み合わせる
        const modifierBits = Array.from(activeModifiers).reduce(
          (acc, mod) => acc | mod,
          0
        );
        const finalKeycode =
          activeModifiers.size > 0
            ? props.keycodeConverter.combineKeycodes(
                keycode,
                DefaultQmkKeycode,
                modifierBits
              ) ?? keycode
            : keycode;

        const offset =
          props.keymap.matrix.cols * currentKey.matrix[0] +
          currentKey.matrix[1];
        const newKeymap = { ...keymap };
        newKeymap[layer][offset] = finalKeycode.value;
        setKeymap(newKeymap);
        sendKeycode(
          layer,
          currentKey.matrix[0],
          currentKey.matrix[1],
          finalKeycode.value
        );

        // 次のキーを探す
        const currentMatrixKey = sortedKeys.find(
          (k) =>
            k.matrix[0] === currentKey.matrix[0] &&
            k.matrix[1] === currentKey.matrix[1]
        );
        const currentSortedIndex = sortedKeys.indexOf(currentMatrixKey!);

        if (currentSortedIndex < sortedKeys.length - 1) {
          // 次のキーのインデックスを元のkeysから探す
          const nextKey = sortedKeys[currentSortedIndex + 1];
          const nextIndex = keys.findIndex(
            (k) =>
              k.matrix[0] === nextKey.matrix[0] &&
              k.matrix[1] === nextKey.matrix[1]
          );
          setCurrentKeyIndex(nextIndex);
        } else {
          setCurrentKeyIndex(-1);
          setCaptureMode(false);
          setActiveModifiers(new Set()); // 修飾キーの状態をクリア
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!captureMode) return;
      event.preventDefault();

      if (isModifierEvent(event)) {
        const modValue =
          event.key === "Control"
            ? ModifierBit.Ctrl
            : event.key === "Shift"
            ? ModifierBit.Shift
            : event.key === "Alt"
            ? ModifierBit.Alt
            : event.key === "Meta"
            ? ModifierBit.GUI
            : 0;

        if (modValue !== 0) {
          const isRight = event.location === 2;

          // activeModifiersから現在のキーを除外した状態を計算
          const nextModifiers = new Set(activeModifiers);
          nextModifiers.delete(modValue | (isRight ? ModifierBit.UseRight : 0));

          // 修飾キーのみが押されていて、かつ他の修飾キーが押されていない場合のみ処理
          if (
            modifierOnlyPress &&
            currentKeyIndex !== -1 &&
            nextModifiers.size === 0
          ) {
            const keys = convertToKeymapKeys(
              props.keymap,
              layoutOption,
              keymap[layer],
              encodermap[layer] ?? [[]],
              props.keycodeConverter
            );

            const currentKey = keys[currentKeyIndex];
            if (currentKey) {
              const baseValue = isRight ? 228 : 224;
              const keycode =
                modValue === ModifierBit.Ctrl
                  ? baseValue
                  : modValue === ModifierBit.Shift
                  ? baseValue + 1
                  : modValue === ModifierBit.Alt
                  ? baseValue + 2
                  : modValue === ModifierBit.GUI
                  ? baseValue + 3
                  : 0;

              if (keycode !== 0) {
                const offset =
                  props.keymap.matrix.cols * currentKey.matrix[0] +
                  currentKey.matrix[1];
                const newKeymap = { ...keymap };
                newKeymap[layer][offset] = keycode;
                setKeymap(newKeymap);
                sendKeycode(
                  layer,
                  currentKey.matrix[0],
                  currentKey.matrix[1],
                  keycode
                );

                moveToNextKey(keys);
              }
            }
          }

          // ここで修飾キーの状態を更新
          setActiveModifiers(nextModifiers);
        }
      }
    };

    if (captureMode) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    captureMode,
    currentKeyIndex,
    layer,
    keymap,
    encodermap,
    activeModifiers,
    modifierOnlyPress,
  ]);

  useEffect(() => {
    if (captureMode) {
      const keys = convertToKeymapKeys(
        props.keymap,
        layoutOption,
        keymap[layer],
        encodermap[layer] ?? [[]],
        props.keycodeConverter
      );

      // matrix順の最初のキーを選択
      const sortedKeys = sortByMatrix(keys.filter((k) => !k.isEncoder));
      if (sortedKeys.length > 0) {
        const firstKey = sortedKeys[0];
        const firstIndex = keys.findIndex(
          (k) =>
            k.matrix[0] === firstKey.matrix[0] &&
            k.matrix[1] === firstKey.matrix[1]
        );
        setCurrentKeyIndex(firstIndex);
      }
    } else {
      setCurrentKeyIndex(-1);
    }
  }, [captureMode]);

  // 次のキーに移動する関数を抽出
  const moveToNextKey = (keys: KeymapKeyProperties[]) => {
    const sortedKeys = sortByMatrix(keys.filter((k) => !k.isEncoder));
    const currentKey = keys[currentKeyIndex];
    const currentMatrixKey = sortedKeys.find(
      (k) =>
        k.matrix[0] === currentKey.matrix[0] &&
        k.matrix[1] === currentKey.matrix[1]
    );
    const currentSortedIndex = sortedKeys.indexOf(currentMatrixKey!);

    if (currentSortedIndex < sortedKeys.length - 1) {
      const nextKey = sortedKeys[currentSortedIndex + 1];
      const nextIndex = keys.findIndex(
        (k) =>
          k.matrix[0] === nextKey.matrix[0] && k.matrix[1] === nextKey.matrix[1]
      );
      setCurrentKeyIndex(nextIndex);
    } else {
      setCurrentKeyIndex(-1);
      setCaptureMode(false);
      setActiveModifiers(new Set());
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LayoutSelector
            via={props.via}
            layouts={props.keymap.layouts}
            option={layoutOption}
            onChange={(option) => {
              setLayoutOption(option);
              sendLayout(option[0]);
            }}
          />
          <LayerSelector
            layerCount={props.layerCount}
            currentLayer={layer}
            onChange={async (layer) => {
              if (!Object.keys(keymap).includes(layer.toString())) {
                const layerKeys = await props.via.GetLayer(layer, {
                  rows: props.keymap.matrix.rows,
                  cols: props.keymap.matrix.cols,
                });
                const newKeymap = { ...keymap };
                newKeymap[layer] = layerKeys;
                setKeymap(newKeymap);
                console.log(`load keymap ${layer}`);
                console.log(layerKeys);

                setEncodermap({
                  ...encodermap,
                  [layer]: await props.via.GetEncoder(layer, encoderCount),
                });
              }
              setLayer(layer);
            }}
          />
        </div>
        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <IconButton
            size="small"
            sx={{
              minWidth: "32px",
              width: "32px",
              height: "32px",
              padding: 0,
              borderRadius: "50%",
            }}
            onClick={async () => {
              const current = await props.via.GetDynamicEntryCountAll();
              if (current.layer - 1 == layer) {
                setLayer(layer - 1);
              }
              props.onDynamicEntryCountChange({
                ...current,
                layer: current.layer - 1,
              });
            }}
          >
            <Remove />
          </IconButton>
          <IconButton
            size="small"
            sx={{
              minWidth: "32px",
              width: "32px",
              height: "32px",
              padding: 0,
              borderRadius: "50%",
            }}
            onClick={async () => {
              const current = await props.via.GetDynamicEntryCountAll();
              props.onDynamicEntryCountChange({
                ...current,
                layer: current.layer + 1,
              });
            }}
          >
            <Add />
          </IconButton>
          <FormControlLabel
            control={
              <Switch
                checked={captureMode}
                onChange={(e) => {
                  setCaptureMode(e.target.checked);
                }}
              />
            }
            label="Key Capture Mode"
          />
        </div>
      </div>
      {Object.keys(keymap).includes(layer.toString()) ? (
        <KeymapLayer
          keymapProps={props.keymap}
          layoutOption={layoutOption}
          keymap={keymap[layer]}
          encodermap={encodermap[layer] ?? [[]]}
          keycodeconverter={props.keycodeConverter}
          highlightIndex={currentKeyIndex}
          captureMode={captureMode}
          onKeyClick={(index) => {
            // Key Capture Mode時はクリックでカーソル移動
            if (captureMode) {
              setCurrentKeyIndex(index);
            }
          }}
          onKeycodeChange={(target, newKeycode) => {
            if (target.isEncoder) {
              const newencoder = { ...encodermap };
              newencoder[layer][target.matrix[0]] =
                target.matrix[1] == 0
                  ? [newKeycode.value, encodermap[layer][target.matrix[0]][1]]
                  : [encodermap[layer][target.matrix[0]][0], newKeycode.value];
              setEncodermap(newencoder);
              sendEncoder(
                layer,
                target.matrix[0],
                target.matrix[1],
                newKeycode.value
              );
              console.log(`update encoder`);
            } else {
              const offset =
                props.keymap.matrix.cols * target.matrix[0] + target.matrix[1];
              const newKeymap = { ...keymap };
              newKeymap[layer][offset] = newKeycode.value;
              setKeymap(newKeymap);
              sendKeycode(
                layer,
                target.matrix[0],
                target.matrix[1],
                newKeycode.value
              );
              console.log(
                `update ${layer},${target.matrix[0]},${target.matrix[1]} to ${newKeycode.value}`
              );
            }
          }}
        ></KeymapLayer>
      ) : (
        <></>
      )}
    </>
  );
}
