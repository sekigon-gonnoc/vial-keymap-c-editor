import { Button, FormControl, FormControlLabel, MenuItem, Select, Switch } from "@mui/material";
import { useEffect, useState } from "react";
import {
  DefaultQmkKeycode,
  KeycodeConverter,
  ModifierBit,
} from "../keycodes/keycodeConverter";
import { KeymapProperties } from "./KeymapTypes";
import { IVialData } from "../../services/IVialData";
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
          props.onChange({ 0: event.target.value } as { [layout: number]: number })
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

function LayerSelector(props: { layerCount: number; onChange: (layer: number) => void }) {
  return (
    <>
      {[...Array(props.layerCount)].map((_, idx) => {
        return (
          <Button
            key={idx}
            value={idx}
            onClick={() => {
              props.onChange(idx);
            }}
          >
            {idx}
          </Button>
        );
      })}
    </>
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
  const [fastMode, setFastMode] = useState(false);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(-1);
  const [activeModifiers, setActiveModifiers] = useState<Set<number>>(
    new Set()
  );

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!fastMode) return;

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
        }
        return;
      }

      const keycode = props.keycodeConverter.convertKeyEventToKeycode(event);
      if (!keycode) return;

      const keys = convertToKeymapKeys(
        props.keymap,
        layoutOption,
        keymap[layer],
        encodermap[layer] ?? [[]],
        props.keycodeConverter
      );

      // 最初のキー選択
      if (currentKeyIndex === -1) {
        let nextIndex = 0;
        while (nextIndex < keys.length && keys[nextIndex].isEncoder) {
          nextIndex++;
        }
        if (nextIndex < keys.length) {
          setCurrentKeyIndex(nextIndex);
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

        // 次の非エンコーダーキーを探す
        let nextIndex = currentKeyIndex + 1;
        while (nextIndex < keys.length && keys[nextIndex].isEncoder) {
          nextIndex++;
        }

        if (nextIndex >= keys.length) {
          setCurrentKeyIndex(-1);
          setFastMode(false);
          setActiveModifiers(new Set()); // 修飾キーの状態をクリア
        } else {
          setCurrentKeyIndex(nextIndex);
          // 修飾キーはクリアしない - 次のキー入力でも使用可能に
        }
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!fastMode) return;

      event.preventDefault();

      // 修飾キーの場合のみ処理
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
          // 右修飾キーの場合はUseRightフラグを追加
          const finalModValue =
            event.location === 2 ? modValue | ModifierBit.UseRight : modValue;

          setActiveModifiers((prev) => {
            const next = new Set(prev);
            next.delete(finalModValue);
            return next;
          });
        }
      }
    };

    if (fastMode) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [fastMode, currentKeyIndex, layer, keymap, encodermap, activeModifiers]);

  useEffect(() => {
    if (fastMode) {
      const keys = convertToKeymapKeys(
        props.keymap,
        layoutOption,
        keymap[layer],
        encodermap[layer] ?? [[]],
        props.keycodeConverter
      );

      // Find first non-encoder key
      let firstIndex = 0;
      while (firstIndex < keys.length && keys[firstIndex].isEncoder) {
        firstIndex++;
      }

      if (firstIndex < keys.length) {
        setCurrentKeyIndex(firstIndex);
      }
    } else {
      setCurrentKeyIndex(-1);
    }
  }, [fastMode]);

  return (
    <>
      <div>
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
        ></LayerSelector>
        <FormControlLabel
          control={
            <Switch
              checked={fastMode}
              onChange={(e) => {
                setFastMode(e.target.checked);
              }}
            />
          }
          label="Fast Mode"
        />
        {Object.keys(keymap).includes(layer.toString()) ? (
          <KeymapLayer
            keymapProps={props.keymap}
            layoutOption={layoutOption}
            keymap={keymap[layer]}
            encodermap={encodermap[layer] ?? [[]]}
            keycodeconverter={props.keycodeConverter}
            highlightIndex={currentKeyIndex}
            onKeycodeChange={(target, newKeycode) => {
              if (target.isEncoder) {
                const newencoder = { ...encodermap };
                newencoder[layer][target.matrix[0]] =
                  target.matrix[1] == 0
                    ? [newKeycode.value, encodermap[layer][target.matrix[0]][1]]
                    : [
                        encodermap[layer][target.matrix[0]][0],
                        newKeycode.value,
                      ];
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
                  props.keymap.matrix.cols * target.matrix[0] +
                  target.matrix[1];
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
      </div>
    </>
  );
}
