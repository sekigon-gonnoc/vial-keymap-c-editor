import { Box, FormControl, MenuItem, Select } from "@mui/material";
import { useEffect, useState } from "react";
import { DynamicEntryCount, IVialData } from "../services/IVialData";
import { ComboEditor } from "./ComboEditor";
import { KeycodeCatalog } from "./KeycodeCatalog";
import { KeycodeConverter } from "./keycodes/keycodeConverter";
import "../App.css";
import { MacroEditor } from "./MacroEditor";
import { OverrideEditor } from "./OverrideEditor";
import { TapDanceEditor } from "./TapDanceEditor";
import { LayerEditor } from "./keymap/LayerEditor";
import { KeymapProperties } from "./keymap/KeymapTypes";

function LanguageSelector(props: {
  languageList: string[];
  lang: string;
  onChange: (lang: string) => void;
}) {
  return (
    <FormControl variant="standard">
      <Select
        value={props.lang}
        label="language"
        onChange={(event) => props.onChange(event.target.value)}
      >
        {props.languageList.map((label) => (
          <MenuItem key={label} value={label}>
            {label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function KeymapEditor(props: {
  keymap: KeymapProperties;
  via: IVialData;
  dynamicEntryCount: {
    layer: number;
    macro: number;
    tapdance: number;
    combo: number;
    override: number;
  };
  onDynamicEntryCountChange: (count: DynamicEntryCount) => void;
}) {
  const [menuType, setMenuType] = useState<
    "layer" | "tapdance" | "macro" | "combo" | "override"
  >("layer");
  const [tdIndex, setTdIndex] = useState(-1);
  const [macroIndex, setMacroIndex] = useState(-1);
  const [comboIndex, setComboIndex] = useState(-1);
  const [overrideIndex, setOverrideIndex] = useState(-1);
  const [lang, setLang] = useState("US");
  const [keycodeConverter, setKeycodeConverter] = useState<KeycodeConverter>();

  useEffect(() => {
    KeycodeConverter.Create(
      props.dynamicEntryCount.layer,
      props.keymap.customKeycodes,
      props.dynamicEntryCount.macro,
      props.dynamicEntryCount.tapdance,
      lang
    ).then((k) => setKeycodeConverter(k));
  }, [
    props.dynamicEntryCount.layer,
    props.keymap.customKeycodes,
    props.dynamicEntryCount,
    lang,
  ]);

  const handleDynamicEntryCountChange = async (type: "combo" | "tapdance" | "override", delta: number) => {
    const current = await props.via.GetDynamicEntryCountAll();
    props.onDynamicEntryCountChange({
      ...current,
      [type]: Math.max(0, (current[type] ?? 0) + delta)
    });
  };

  return keycodeConverter === undefined ? (
    <></>
  ) : (
    <>
      <Box hidden={menuType !== "layer"}>
        <LayerEditor
          {...props}
          layerCount={props.dynamicEntryCount.layer}
          keycodeConverter={keycodeConverter}
          onDynamicEntryCountChange={props.onDynamicEntryCountChange}
        ></LayerEditor>
      </Box>
      <Box hidden={menuType !== "tapdance"}>
        <TapDanceEditor
          via={props.via}
          keycodeConverter={keycodeConverter}
          tapdanceIndex={tdIndex}
          onBack={() => {
            setMenuType("layer");
          }}
        ></TapDanceEditor>
      </Box>
      <Box hidden={menuType !== "macro"}>
        <MacroEditor
          via={props.via}
          keycodeConverter={keycodeConverter}
          macroIndex={macroIndex}
          macroCount={props.dynamicEntryCount.macro}
          onBack={() => {
            setMenuType("layer");
          }}
        ></MacroEditor>
      </Box>
      <Box hidden={menuType !== "combo"}>
        <ComboEditor
          via={props.via}
          keycodeConverter={keycodeConverter}
          comboIndex={comboIndex}
          comboCount={props.dynamicEntryCount.combo}
          onBack={() => {
            setMenuType("layer");
          }}
        ></ComboEditor>
      </Box>
      <Box hidden={menuType !== "override"}>
        <OverrideEditor
          via={props.via}
          keycodeConverter={keycodeConverter}
          overrideIndex={overrideIndex}
          overrideCount={props.dynamicEntryCount.override}
          onBack={() => {
            setMenuType("layer");
          }}
        ></OverrideEditor>
      </Box>
      <Box>
        <LanguageSelector
          languageList={["US", "Japanese"]}
          lang={lang}
          onChange={(lang) => setLang(lang)}
        ></LanguageSelector>
      </Box>
      <KeycodeCatalog
        keycodeConverter={keycodeConverter}
        tab={[
          { label: "Basic", keygroup: ["internal", "basic", "modifiers"] },
          { label: "Mouse", keygroup: ["mouse"] },
          { label: "User/Wireless", keygroup: ["custom", "kb", "user"] },
          { label: "Media", keygroup: ["media"] },
          { label: "Quantum", keygroup: ["quantum"] },
          { label: "Layer", keygroup: ["layer"] },
          { label: "Macro", keygroup: ["macro"] },
          { label: "TapDance", keygroup: ["tapdance"] },
          { label: "Combo/Override", keygroup: ["combo", "keyoverride"] },
        ]}
        tapdanceCount={props.dynamicEntryCount.tapdance}
        comboCount={props.dynamicEntryCount.combo}
        overrideCount={props.dynamicEntryCount.override}
        onTapdanceSelect={(index) => {
          setMenuType("tapdance");
          setTdIndex(index);
        }}
        onMacroSelect={(index) => {
          setMenuType("macro");
          setMacroIndex(index);
        }}
        onComoboSelect={(index) => {
          setMenuType("combo");
          setComboIndex(index);
        }}
        onOverrideSelect={(index) => {
          setMenuType("override");
          setOverrideIndex(index);
        }}
        onDynamicEntryCountChange={handleDynamicEntryCountChange}
      ></KeycodeCatalog>
    </>
  );
}

export default KeymapEditor;