import { useState } from "react";
import { GitHubApp } from "./components/GitHubApp";
import { KeymapEditor } from "./components/KeymapEditor"
import { VialData } from "./services/VialData";
import { generateKeymapC, parseKeymapC, QmkKeymap } from "./services/keymap-c";

function App() {
  const [vialJson, setVialJson] = useState<any>(undefined);
  const [keyboardJson, setKeyboardJson] = useState<any>(undefined);
  const [keymapC, setKeymapC] = useState<QmkKeymap | undefined>(undefined);
  const [configH, setConfigH] = useState<string | undefined>(undefined);
  const [vialData, setVialData] = useState<VialData | undefined>(undefined);

  return (
    <>
      <GitHubApp
        onloaded={async (vialJson, keyboardJson, keymapC, configH) => {
          setVialJson(vialJson);
          setKeyboardJson(keyboardJson);
          const newKeymapC = parseKeymapC(keymapC, keyboardJson);
          setKeymapC(newKeymapC);
          setConfigH(configH);
          const newVialData = new VialData(
            newKeymapC,
            newKeymapC.layers.length
          );
          await newVialData.initKeycodeTable(vialJson.customKeycodes);
          setVialData(newVialData);
        }}
        oncommit={() => {
          if (!vialData) {
            alert("Invalid keymap");
            throw new Error("VialData is not initialized");
          }
          return generateKeymapC(vialData.keymap);
        }}
      />
      {vialJson && keyboardJson && keymapC && vialData && configH && (
        <>
          <div style={{ height: "16px" }} />
          <KeymapEditor
            keymap={vialJson}
            via={vialData}
            dynamicEntryCount={{
              layer: keyboardJson.dynamic_keymap?.layer_count ?? 4,
              macro: 0,
              tapdance: 0,
              combo: 0,
              override: 0,
            }}
          />
        </>
      )}
    </>
  );
}

export default App;
