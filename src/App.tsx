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
          const newKeymapC = parseKeymapC(keymapC, keyboardJson, configH);
          setKeymapC(newKeymapC);
          setConfigH(configH);
          const newVialData = new VialData(
            newKeymapC,
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
              layer: vialData.keymap.dynamicLayerCount,
              macro: vialData.keymap.dynamicMacroCount,
              tapdance: vialData.keymap.dynamicTapDanceCount,
              combo: vialData.keymap.dynamicComboCount,
              override: vialData.keymap.dynamicOverrideCount,
            }}
          />
        </>
      )}
    </>
  );
}

export default App;
