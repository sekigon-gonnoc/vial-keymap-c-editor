import { useState } from "react";
import { GitHubApp } from "./components/GitHubApp";
import { KeymapEditor } from "./components/KeymapEditor"
import { VialData } from "./services/VialData";
import { parseKeymapC, QmkKeymap } from "./services/keymap-c";

function App() {
  const [vialJson, setVialJson] = useState<any>(undefined);
  const [keyboardJson, setKeyboardJson] = useState<any>(undefined);
  const [keymapC, setKeymapC] = useState<QmkKeymap | undefined>(undefined);

  return (
    <>
      <GitHubApp onloaded={(vialJson, keyboardJson, keymapC) => {
        setVialJson(vialJson);
        setKeyboardJson(keyboardJson);
        setKeymapC(parseKeymapC(keymapC));
      }} />
      {vialJson && keyboardJson && keymapC && (
        <KeymapEditor
          keymap={vialJson}
          via={new VialData()}
          dynamicEntryCount={{
            layer: keyboardJson.dynamic_keymap?.layer_count ?? 4,
            macro: 0,
            tapdance: 0,
            combo: 0,
            override: 0,
          }}
        />
      )}
    </>
  );
}

export default App;
