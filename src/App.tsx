import { useState } from "react";
import { GitHubApp } from "./components/GitHubApp";
import { KeymapEditor } from "./components/KeymapEditor"
import { VialData } from "./services/VialData";

function App() {
  const [vialJson, setVialJson] = useState<any>(undefined);
  return (
    <>
      <GitHubApp onloaded={(vialJson) => setVialJson(vialJson)} />
      {vialJson && (
        <KeymapEditor
          keymap={vialJson}
          via={new VialData()}
          dynamicEntryCount={{
            layer: 1,
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
