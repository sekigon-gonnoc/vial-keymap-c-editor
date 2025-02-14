import { useState } from "react";
import { GitHubApp } from "./components/github/GitHubApp";
import { KeymapEditor } from "./components/KeymapEditor"
import { VialData } from "./services/VialData";
import { generateKeymapC, parseKeymapC, QmkKeymap } from "./services/KeymapParser/keymap-c";
import { generateRulesMk } from "./services/KeymapParser/parseRules";

function App() {
  const [vialJson, setVialJson] = useState<any>(undefined);
  const [keyboardJson, setKeyboardJson] = useState<any>(undefined);
  const [keymapC, setKeymapC] = useState<QmkKeymap | undefined>(undefined);
  const [configH, setConfigH] = useState<string | undefined>(undefined);
  const [rulesMk, setRulesMk] = useState<string | undefined>(undefined);
  const [vialData, setVialData] = useState<VialData | undefined>(undefined);

  return (
    <>
      <GitHubApp
        onloaded={async (vialJson, keyboardJson, keymapC, configH, rulesMk) => {
          setVialJson(vialJson);
          setKeyboardJson(keyboardJson);
          setRulesMk(rulesMk);
          const newKeymapC = parseKeymapC(keymapC, keyboardJson, configH);
          setKeymapC(newKeymapC);
          setConfigH(configH);
          const newVialData = new VialData(newKeymapC);
          await newVialData.initKeycodeTable(vialJson.customKeycodes);
          setVialData(newVialData);
        }}
        onunloaded={() => {
          setVialJson(undefined);
          setKeyboardJson(undefined);
          setKeymapC(undefined);
          setConfigH(undefined);
          setVialData(undefined);
        }}
        oncommit={() => {
          if (!vialData) {
            alert("Invalid keymap");
            throw new Error("VialData is not initialized");
          }

          if (!rulesMk) {
            alert("Invalid rules.mk");
            throw new Error("rules.mk is not initialized");
          }

          return {
            'keymap.c': generateKeymapC(vialData.keymap),
            'rules.mk': generateRulesMk(rulesMk)
          };
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
              tapdance: vialData.keymap.tapDanceEntries.length,
              combo: vialData.keymap.comboEntries.length,
              override: vialData.keymap.keyOverrideEntries.length,
            }}
          />
        </>
      )}
    </>
  );
}

export default App;
