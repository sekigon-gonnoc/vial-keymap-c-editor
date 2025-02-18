import { useState, lazy } from "react";
import { GitHubApp } from "./components/github/GitHubApp";
import { Box, Tab, Tabs } from "@mui/material";
import { VialData } from "./services/VialData";
import { changeLayerCount, generateKeymapC, parseKeymapC, QmkKeymap } from "./services/KeymapParser/keymap-c";
import { generateRulesMk } from "./services/KeymapParser/parseRules";
import { DynamicEntryCount } from "./services/IVialData";
import { changeTapDanceCount } from "./services/KeymapParser/tapDanceParser";
import { changeComboCount } from "./services/KeymapParser/comboParser";
import { changeKeyOverrideCount } from "./services/KeymapParser/keyoverrideParser";
import { updateVialConfig } from "./services/KeymapParser/configParser";
import { QuantumSettingsEditor } from "./components/QuantumSettingsEditor";

const KeymapEditor = lazy(() => import("./components/KeymapEditor"));

function App() {
  const [vialJson, setVialJson] = useState<any>(undefined);
  const [keyboardJson, setKeyboardJson] = useState<any>(undefined);
  const [keymapC, setKeymapC] = useState<QmkKeymap | undefined>(undefined);
  const [configH, setConfigH] = useState<string | undefined>(undefined);
  const [rulesMk, setRulesMk] = useState<string | undefined>(undefined);
  const [vialData, setVialData] = useState<VialData | undefined>(undefined);
  const [dynamicEntryCount, setDynamicEntryCount] = useState<{
    layer: number;
    macro: number;
    tapdance: number;
    combo: number;
    override: number;
  }>();
  const [tabValue, setTabValue] = useState(0);

  const updateDynamicEntryCount = (count: DynamicEntryCount) => {
    if (vialData && configH) {
      const newLayerCount = changeLayerCount(vialData.keymap, count.layer);
      const newKeyboardJson = { ...keyboardJson, dynamic_keymap: { layer_count: newLayerCount } };
      setKeyboardJson(newKeyboardJson);
      vialData.keymap.tapDanceEntries = changeTapDanceCount(
        vialData.keymap.tapDanceEntries,
        count.tapdance
      );
      vialData.keymap.comboEntries = changeComboCount(
        vialData.keymap.comboEntries,
        count.combo
      );
      vialData.keymap.keyOverrideEntries = changeKeyOverrideCount(
        vialData.keymap.keyOverrideEntries,
        count.override
      );
      count = {
        ...count,
        layer: newLayerCount,
        tapdance: vialData.keymap.tapDanceEntries.length,
        combo: vialData.keymap.comboEntries.length,
        override: vialData.keymap.keyOverrideEntries.length,
      };
      setDynamicEntryCount(count);

      // config.hの更新
      const newConfigH = updateVialConfig(configH, {
        tapDanceEntries: count.tapdance,
        comboEntries: count.combo,
        keyOverrideEntries: count.override,
      });
      setConfigH(newConfigH);
    }
  };

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
          setDynamicEntryCount({
            layer: newKeymapC.layers.length,
            macro: newKeymapC.macroEntries.length,
            tapdance: newKeymapC.tapDanceEntries.length,
            combo: newKeymapC.comboEntries.length,
            override: newKeymapC.keyOverrideEntries.length,
          });
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

          if (!keyboardJson) {
            alert("Invalid keyboard.json");
            throw new Error("keyboard.json is not initialized");
          }

          if (!configH) {
            alert("Invalid config.h");
            throw new Error("config.h is not initialized");
          }

          return {
            'keymap.c': generateKeymapC(vialData.keymap),
            'rules.mk': generateRulesMk(rulesMk),
            'keyboard.json': JSON.stringify(keyboardJson, null, 4),
            'config.h': configH,
          };
        }}
      />
      {vialJson && keyboardJson && keymapC && vialData && configH && dynamicEntryCount && (
        <>
          <div style={{ height: "16px" }} />
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(_e, v) => setTabValue(v)}>
              <Tab label="Keymap" />
              <Tab label="Quantum Settings" />
            </Tabs>
          </Box>
          <Box hidden={tabValue !== 0}>
            <KeymapEditor
              keymap={vialJson}
              via={vialData}
              dynamicEntryCount={dynamicEntryCount}
              onDynamicEntryCountChange={updateDynamicEntryCount}
            />
          </Box>
          <Box hidden={tabValue !== 1}>
            <QuantumSettingsEditor
              via={vialData}
              onChange={(values) => {
                vialData.SetQuantumSettingsValue(values);
              }}
            />
          </Box>
        </>
      )}
    </>
  );
}

export default App;
