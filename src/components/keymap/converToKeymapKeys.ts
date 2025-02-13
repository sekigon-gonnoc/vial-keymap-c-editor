import { match, P } from "ts-pattern";
import { KeycodeConverter } from "../keycodes/keycodeConverter";
import { KeymapProperties } from "./KeymapTypes";
import { KeymapKeyProperties } from "./KeyComponents";

export function convertToKeymapKeys(
  props: KeymapProperties,
  layoutOptions: { [layout: number]: number },
  keymap: number[],
  encodermap: number[][],
  keycodeconverter: KeycodeConverter,
): KeymapKeyProperties[] {
  let current = {
    x: 0,
    y: 0,
    offsetx: 0,
    offsety: 0,
    r: 0,
    rx: 0,
    ry: 0,
    w: 1,
    h: 1,
  };

  const keys: KeymapKeyProperties[] = [];
  let firstKey = true;
  for (const row of props.layouts.keymap) {
    for (const col of row) {
      match(col)
        .with(P.string, (col) => {
          const layout = col
            .split("\n")[3]
            ?.split(",")
            ?.map((s) => parseInt(s));

          const keyPos = col
            .split("\n")[0]
            .split(",")
            .map((v) => parseInt(v))
            .slice(0, 2);

          const isEncoder = col.split("\n")[9] === "e";

          if ((layout?.length ?? 0) < 2 || layoutOptions[layout[0]] == layout[1]) {
            if (firstKey) {
              firstKey = false;
              current.y = 0;
            }
            keys.push({
              ...current,
              matrix: keyPos,
              layout: [],
              keycode: keycodeconverter.convertIntToKeycode(
                isEncoder
                  ? (encodermap?.[keyPos[0]]?.[keyPos[1]] ?? 0)
                  : keymap[keyPos[1] + keyPos[0] * props.matrix.cols],
              ),
              isEncoder: isEncoder,
              reactKey: "",
            });
            current.x += current.w;
            current.w = 1;
            current.h = 1;
          }
        })
        .with(P._, (col) => {
          current = {
            ...current,
            ...col,
            x: current.x + (col.r ? 0 : (col.x ?? 0)),
            y: current.y + (col.r ? 0 : (col.y ?? 0)),
            offsetx: col.r ? (col.x ?? 0) : 0,
            offsety: col.r ? (col.y ?? 0) : 0,
          };
        });
    }
    current.x = 0;
    current.y += 1;
    current.y = current.r ? 0 : current.y;
    current.w = 1;
    current.h = 1;
  }
  return keys;
}