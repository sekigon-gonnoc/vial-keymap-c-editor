import { IVialData } from "./IVialData";

export const QuantumSettingDefinition: {
  label: string;
  content: {
    type: string;
    label: string;
    content: (string | number)[];
    options?: (string | number)[] | (string | number)[][];
    default?: number;
  }[];
}[] = [
  {
    label: "Magic",
    content: [
      {
        type: "multiple-checkbox",
        label: "Magic",
        content: ["DEFAULT_KEYMAP_EECONFIG", 21, 2],
        options: [
          ["Swap Control CapsLock", 0],
          ["CapsLock to Control", 1],
          ["Swap LAlt LGUI", 2],
          [`Swap RAlt RGUI`, 3],
          ["No GUI", 4],
          ["Swap Grave Esc", 5],
          ["Swap Backslash Backspace", 6],
          ["Swap LCTL LGUI", 8],
          ["Swap RCtl RGUI", 9],
        ],
        default: 0,
      },
    ],
  },
  {
    label: "Grave Escape",
    content: [
      {
        type: "multiple-checkbox",
        label: "Grave Escape Override",
        content: ["DEFAULT_GRAV_ESC_EECONFIG", 1, 1],
        options: [
          "Send Esc if Alt is pressed",
          "Send Esc if Ctrl is pressed",
          "Send Esc if GUI is pressed",
          "Send Esc if Shift is pressed",
        ],
        default: 0,
      },
    ],
  },

  {
    label: "Tap-Hold",
    content: [
      {
        type: "range",
        label: "Tapping term [ms]",
        content: ["tapping.term", 7, 2],
        default: 200,
      },
      {
        type: "multiple-checkbox",
        label: "Tapping options",
        content: ["VIAL_DEFAULT_TAPPING", 8, 1],
        options: [
          "Permissive hold",
          "Ignore Mod Tap interrupt",
          "Tapping force hold",
          "Retro tapping",
        ],
        default: 0,
      },
      {
        type: "range",
        label: "Tap code delay [ms]",
        content: ["qmk.tap_keycode_delay", 18, 2],
        options: [0, 500],
        default: 0,
      },
      {
        type: "range",
        label: "Tap hold Caps delay [ms]",
        content: ["qmk.tap_capslock_delay", 19, 2],
        options: [0, 500],
        default: 80,
      },
      {
        type: "range",
        label: "Tapping toggle",
        content: ["tapping.toggle", 20, 1],
        options: [0, 99],
        default: 5,
      },
    ],
  },
  {
    label: "Auto Shift",
    content: [
      {
        type: "multiple-checkbox",
        label: "Auto Shift option",
        content: ["VIAL_DEFAULT_AUTO_SHIFT", 3, 1],
        options: [
          "Enable",
          "Enable for modifiers",
          "No Auto Shift Special",
          "No Auto Shift Numeric",
          "No Auto Shift Alpha",
          "Enable keyrepeat",
          "Disable keyrepeat when timeout is exceeded",
        ],
        default: 0,
      },
      {
        type: "range",
        label: "Auto Shift timeout",
        content: ["AUTO_SHIFT_TIMEOUT", 4, 1],
        options: [0, 255],
        default: 175,
      },
    ],
  },

  {
    label: "Combo",
    content: [
      {
        type: "range",
        label: "Combo term [ms]",
        content: ["combo.term", 2, 2],
        options: [0, 500],
        default: 50,
      },
    ],
  },
  {
    label: "One Shot Keys",
    content: [
      {
        type: "range",
        label: "Tap toggle count",
        content: ["oneshot.tap_toggle", 5, 1],
        options: [0, 50],
        default: 5,
      },
      {
        type: "range",
        label: "One shot key timeout [ms]",
        content: ["oneshot.timeout", 6, 2],
        options: [0, 65535],
        default: 5000,
      },
    ],
  },
  {
    label: "Mouse Keys",
    content: [
      {
        type: "range",
        label: "Mouse key delay[ms]",
        content: ["mousekey.delay", 9, 2],
        options: [0, 500],
        default: 10,
      },
      {
        type: "range",
        label: "Mouse key interval[ms]",
        content: ["mousekey.interval", 10, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key move delta",
        content: ["MOUSEKEY_MOVE_DELTA", 11, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key max speed",
        content: ["mousekey.max_speed", 12, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key time to max[ms]",
        content: ["mousekey.time_to_max", 13, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key wheel delay[ms]",
        content: ["mousekey.wheel_delay", 14, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key wheel interval[ms]",
        content: ["MOUSEKEY_WHEEL_INTERVAL", 15, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key wheel max speed",
        content: ["MOUSEKEY_WHEEL_MAX_SPEED", 16, 2],
        options: [0, 500],
      },
      {
        type: "range",
        label: "Mouse key wheel time to max[ms]",
        content: ["MOUSE_KEY_WHEL_TIME_TO_MAX", 17, 2],
        options: [0, 500],
      },
    ],
  },
];

export async function QuantumSettingsReadAll(
  via: IVialData
): Promise<{ [id: string]: number }> {
  const ids = QuantumSettingDefinition.flatMap((set) =>
    set.content.map((setting) => setting.content)
  );

  return Object.entries(
    await via.GetQuantumSettingsValue(ids.map((id) => id[0] as string))
  ).reduce((acc, v) => {
    return {
      ...acc,
      [v[0]]:
        v[1] &
        ((1 <<
          ((ids.find((k) => k[1].toString() === v[0])?.[2] as number) * 8)) -
          1),
    };
  }, {} as { [id: string]: number });
}
