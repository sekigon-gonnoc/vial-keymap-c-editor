import { Grid } from "@mui/material";
import { useState } from "react";
import {
  DefaultQmkKeycode,
  KeycodeConverter,
  QmkKeycode,
} from "../keycodes/keycodeConverter";
import { KeymapKeyPopUp } from "./KeymapKeyPopUp";
import { KeymapProperties } from "./KeymapTypes";
import { convertToKeymapKeys } from "./converToKeymapKeys";

export const WIDTH_1U = 60;

export function EditableKey(props: {
  keycode: QmkKeycode;
  onKeycodeChange?: (newKeycode: QmkKeycode) => void;
  onClick?: (target: HTMLElement) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <div
      className={`keymap-key ${isDragOver && "drag-over"}`}
      style={{
        width: WIDTH_1U,
        height: WIDTH_1U,
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const keycode = JSON.parse(event.dataTransfer.getData("QmkKeycode"));
        props.onKeycodeChange?.(keycode);
        setIsDragOver(false);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onClick={(event) => props.onClick?.(event.currentTarget)}
    >
      <Grid container direction={"column"} className="legend-container">
        <Grid item xs={3.5}>
          <div className="mod-legend">{props.keycode.modLabel ?? ""}</div>
        </Grid>
        <Grid item xs={5}>
          <div className="main-legend">{props.keycode.label}</div>
        </Grid>
        <Grid item xs={3.5}>
          <div className="hold-legend">{props.keycode.holdLabel ?? ""}</div>
        </Grid>
      </Grid>
    </div>
  );
}

export interface KeymapKeyProperties {
  matrix: number[];
  x: number;
  y: number;
  offsetx: number;
  offsety: number;
  r: number;
  rx: number;
  ry: number;
  w: number;
  h: number;
  layout: number[];
  keycode: QmkKeycode;
  reactKey: string;
  isEncoder?: boolean;
  onKeycodeChange?: (
    target: KeymapKeyProperties,
    newKeycode: QmkKeycode
  ) => void;
  onClick?: (target: HTMLElement) => void;
  className?: string;
}

export function KeymapKey(props: KeymapKeyProperties) {
  const [isDragOver, setIsDragOver] = useState(false);
  return (
    <div
      key={props.reactKey}
      className={`keymap-key ${props.isEncoder && "keymap-encoder"} ${
        isDragOver && "drag-over"
      } ${props.className}`}
      style={
        props.r != 0
          ? {
              position: "absolute",
              top: (props.ry + props.offsety) * WIDTH_1U,
              left: (props.rx + props.offsetx) * WIDTH_1U,
              width: props.w * WIDTH_1U - 3,
              height: props.h * WIDTH_1U - 3,
              transform: `rotate(${props.r}deg)`,
              transformOrigin: `${-props.offsetx * WIDTH_1U}px ${
                -props.offsety * WIDTH_1U
              }px`,
            }
          : {
              position: "absolute",
              top: props.y * WIDTH_1U,
              left: props.x * WIDTH_1U,
              width: props.w * WIDTH_1U - 3,
              height: props.h * WIDTH_1U - 3,
            }
      }
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        const keycode = JSON.parse(event.dataTransfer.getData("QmkKeycode"));
        props.onKeycodeChange?.(props, keycode);
        setIsDragOver(false);
      }}
      onDragLeave={() => {
        setIsDragOver(false);
      }}
      onClick={(event) => props.onClick?.(event.currentTarget)}
    >
      <Grid container direction={"column"} className="legend-container">
        <Grid item xs={3.5}>
          <div className="mod-legend">{props.keycode.modLabel ?? ""}</div>
        </Grid>
        <Grid item xs={5}>
          <div className="main-legend">{props.keycode.label}</div>
        </Grid>
        <Grid item xs={3.5}>
          <div className="hold-legend">{props.keycode.holdLabel ?? ""}</div>
        </Grid>
      </Grid>
    </div>
  );
}

export function KeymapLayer(props: {
  keymapProps: KeymapProperties;
  layoutOption: { [layout: number]: number };
  keymap: number[];
  encodermap: number[][];
  keycodeconverter: KeycodeConverter;
  highlightIndex?: number;
  onKeycodeChange?: (
    target: KeymapKeyProperties,
    newKeycode: QmkKeycode
  ) => void;
}) {
  const [popupOpen, setpopupOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | undefined>(undefined);
  const [focusedKey, setFocusedKey] = useState<KeymapKeyProperties | undefined>(
    undefined
  );
  const [candidateKeycode, setCandidateKeycode] =
    useState<QmkKeycode>(DefaultQmkKeycode);

  const keymapkeys = convertToKeymapKeys(
    props.keymapProps,
    props.layoutOption,
    props.keymap,
    props.encodermap,
    props.keycodeconverter
  );

  return (
    <>
      <div
        style={{
          position: "relative",
          marginTop: 50,
          height: `${
            (Math.max(...keymapkeys.map((k) => k.y)) + 1) * WIDTH_1U
          }px`,
        }}
      >
        {keymapkeys.map((p, idx) => (
          <KeymapKey
            key={idx}
            {...p}
            className={idx === props.highlightIndex ? "highlight-next" : ""}
            onKeycodeChange={props.onKeycodeChange}
            onClick={(target) => {
              setCandidateKeycode(p.keycode);
              setFocusedKey(p);
              setpopupOpen(true);
              setAnchorEl(target);
            }}
            reactKey={idx.toString()}
          />
        ))}
      </div>
      <KeymapKeyPopUp
        open={popupOpen}
        keycodeconverter={props.keycodeconverter}
        keycode={focusedKey?.keycode ?? DefaultQmkKeycode}
        anchor={anchorEl}
        keymapKey={focusedKey}
        onClickAway={() => {
          if (popupOpen) {
            setpopupOpen(false);
            setAnchorEl(undefined);
            if (focusedKey) {
              props.onKeycodeChange?.(focusedKey!, candidateKeycode);
            }
          }
        }}
        onChange={(event) => {
          setCandidateKeycode(event.keycode);
        }}
      ></KeymapKeyPopUp>
    </>
  );
}
