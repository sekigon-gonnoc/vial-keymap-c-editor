import { QmkKeycode } from "../keycodes/keycodeConverter";

export interface KeymapProperties {
  matrix: { rows: number; cols: number };
  layouts: {
    labels?: string[][];
    keymap: (
      | string
      | {
          x?: number;
          y?: number;
          r?: number;
          rx?: number;
          ry?: number;
          w?: number;
          h?: number;
        }
    )[][];
  };
  customKeycodes?: { name: string; title: string; shortName: string }[];
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
  onKeycodeChange?: (target: KeymapKeyProperties, newKeycode: QmkKeycode) => void;
  onClick?: (target: HTMLElement) => void;
  className?: string;
}

export const WIDTH_1U = 60;

export const isModifierEvent = (event: KeyboardEvent): boolean => {
  return event.key === 'Control' || 
         event.key === 'Shift' || 
         event.key === 'Alt' || 
         event.key === 'Meta';
};
