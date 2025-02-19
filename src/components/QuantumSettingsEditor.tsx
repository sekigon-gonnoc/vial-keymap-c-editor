import { Box, Tab, Tabs } from "@mui/material";
import { useEffect, useState } from "react";
import { QuantumSettingDefinition } from "../services/quantumSettings";
import { IVialData } from "../services/IVialData";
import { MenuSectionProperties, ViaMenuItem } from "./ViaMenuItem";

export function QuantumSettingsEditor(props: {
  via: IVialData;
  onChange: (value: { [id: string]: number | undefined }) => void;
}) {
  const [tabValue, setTabValue] = useState(0);
  const [quantumValue, setQuantumValue] = useState<{
    [id: string]: number | undefined;
  }>({});

  // 初回ロード時に全設定を読み込む
  useEffect(() => {
    const allIds = QuantumSettingDefinition.flatMap(menu => 
      menu.content.map(item => item.content[0] as string)
    );
    
    navigator.locks.request("load-quantum-settings", async () => {
      const values = await props.via.GetQuantumSettingsValue(allIds);
      const newValues = Object.entries(values).reduce((acc, [id, value]) => {
        const setting = QuantumSettingDefinition
          .flatMap(menu => menu.content)
          .find(item => item.content[0] === id);
        
        if (setting) {
          const mask = (1 << (8 * (setting.content[2] as number))) - 1;
          return {
            ...acc,
            [id]: value & mask
          };
        }
        return acc;
      }, {});

      setQuantumValue(newValues);
      console.log('Loaded quantum settings:', newValues);
    });
  }, [props.via]);

  return (
    <>
      <Tabs
        value={tabValue}
        onChange={(_event, value) => setTabValue(value)}
        variant="scrollable"
        scrollButtons="auto"
      >
        {QuantumSettingDefinition.map((menu) => (
          <Tab key={menu.label} label={menu.label}></Tab>
        ))}
      </Tabs>

      {QuantumSettingDefinition.map((_menu, idx) => (
        <Box key={idx} hidden={tabValue !== idx}>
          <ViaMenuItem
            {...(QuantumSettingDefinition[idx] as MenuSectionProperties)}
            customValues={quantumValue}
            onChange={(id, value) => {
              console.log(`update ${id} to ${value}`);
              const newValues = { ...quantumValue, [id[0]]: value };
              setQuantumValue(newValues);
              props.onChange(newValues);
            }}
          />
        </Box>
      ))}
    </>
  );
}
