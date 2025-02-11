import { GitHubApp } from "./components/GitHubApp";
import { KeymapEditor } from "./components/KeymapEditor"
import { VialData } from "./services/VialData";

const vialDef = {
  name: "tutorial",
  vendorId: "0xFEED",
  productId: "0x0000",
  matrix: {
    rows: 8,
    cols: 5,
  },
  layouts: {
    labels: [["Layout", "LAYOUT"]],
    keymap: [
      [
        {
          x: 2,
        },
        "0,2\n\n\n0,0",
        {
          x: 5.3,
        },
        "4,2\n\n\n0,0",
      ],
      [
        {
          x: 1,
          y: -0.75,
        },
        "0,1\n\n\n0,0",
        {
          x: 1,
        },
        "0,3\n\n\n0,0",
        {
          x: 3.3,
        },
        "4,1\n\n\n0,0",
        {
          x: 1,
        },
        "4,3\n\n\n0,0",
      ],
      [
        {
          y: -0.75,
        },
        "0,0\n\n\n0,0",
        {
          x: 3,
        },
        "0,4\n\n\n0,0",
        {
          x: 1.3,
        },
        "4,0\n\n\n0,0",
        {
          x: 3,
        },
        "4,4\n\n\n0,0",
      ],
      [
        {
          x: 2,
          y: -0.5,
        },
        "1,2\n\n\n0,0",
        {
          x: 5.3,
        },
        "5,2\n\n\n0,0",
      ],
      [
        {
          x: 1,
          y: -0.75,
        },
        "1,1\n\n\n0,0",
        {
          x: 1,
        },
        "1,3\n\n\n0,0",
        {
          x: 3.3,
        },
        "5,1\n\n\n0,0",
        {
          x: 1,
        },
        "5,3\n\n\n0,0",
      ],
      [
        {
          y: -0.75,
        },
        "1,0\n\n\n0,0",
        {
          x: 3,
        },
        "1,4\n\n\n0,0",
        {
          x: 1.3,
        },
        "5,0\n\n\n0,0",
        {
          x: 3,
        },
        "5,4\n\n\n0,0",
      ],
      [
        {
          x: 2,
          y: -0.5,
        },
        "2,2\n\n\n0,0",
        {
          x: 5.3,
        },
        "6,2\n\n\n0,0",
      ],
      [
        {
          x: 1,
          y: -0.75,
        },
        "2,1\n\n\n0,0",
        {
          x: 1,
        },
        "2,3\n\n\n0,0",
        {
          x: 3.3,
        },
        "6,1\n\n\n0,0",
        {
          x: 1,
        },
        "6,3\n\n\n0,0",
      ],
      [
        {
          y: -0.75,
        },
        "2,0\n\n\n0,0",
        {
          x: 3,
        },
        "2,4\n\n\n0,0",
        {
          x: 1.3,
        },
        "6,0\n\n\n0,0",
        {
          x: 3,
        },
        "6,4\n\n\n0,0",
      ],
      [
        {
          x: 2,
        },
        "3,2\n\n\n0,0",
        {
          x: 5.3,
        },
        "7,2\n\n\n0,0",
      ],
      [
        {
          r: 10,
          rx: 3.189420212327361,
          ry: 3.4957720346604315,
        },
        "3,3\n\n\n0,0",
      ],
      [
        {
          r: -10,
          rx: 7.125772034660436,
          ry: 3.6694202123273616,
        },
        "7,1\n\n\n0,0",
      ],
      [
        {
          r: 20,
          rx: 4.351163761269882,
          ry: 3.734143617944212,
        },
        "3,4\n\n\n0,0",
      ],
      [
        {
          r: -20,
          rx: 6.009143617944213,
          ry: 4.07616376126988,
        },
        "7,0\n\n\n0,0",
      ],
    ],
  },
};

function App() {
  return (
    <>
      <GitHubApp />
      <KeymapEditor
        keymap={vialDef}
        via={new VialData()}
        dynamicEntryCount={{
          layer: 1,
          macro: 0,
          tapdance: 0,
          combo: 0,
          override: 0,
        }}
      ></KeymapEditor>
    </>
  );
}

export default App;
