import { useEffect, useState } from "react";
import { DefaultQmkKeycode, KeycodeConverter, ModifierBit, ModifierBits, QmkKeycode } from "../keycodes/keycodeConverter";
import { KeymapKeyProperties } from "./KeyComponents";
import { matchSorter } from "match-sorter";
import { Autocomplete, Box, Checkbox, ClickAwayListener, FormControlLabel, FormGroup, Popper, TextField } from "@mui/material";

export function KeymapKeyPopUp(props: {
  open: boolean;
  keycodeconverter: KeycodeConverter;
  keycode: QmkKeycode;
  anchor?: HTMLElement;
  keymapKey?: KeymapKeyProperties;
  onClickAway?: () => void;
  onChange?: (event: { keymapkey?: KeymapKeyProperties; keycode: QmkKeycode }) => void;
}) {
  const [tapValue, setTapValue] = useState<QmkKeycode>(
    props.keycodeconverter.getTapKeycode(props.keycode),
  );
  const [tapInputValue, setTapInputValue] = useState<string>(
    props.keycodeconverter.getTapKeycode(props.keycode).label,
  );
  const [holdValue, setHoldValue] = useState<QmkKeycode>(
    props.keycodeconverter.getHoldKeycode(props.keycode),
  );
  const [holdInputValue, setHoldInputValue] = useState<string>(
    props.keycodeconverter.getHoldKeycode(props.keycode).label,
  );
  const [modsValue, setModsValue] = useState<ModifierBits>(
    props.keycodeconverter.getModifier(props.keycode),
  );
  const [keycodeValue, setKeycodeValue] = useState<string>("");

  const filterOptions = (options: QmkKeycode[], { inputValue }: { inputValue: string }) =>
    matchSorter(options, inputValue, { keys: ["label", "key", "aliases.*"] });

  useEffect(() => {
    setTapValue(props.keycodeconverter.getTapKeycode(props.keycode));
    setTapInputValue(props.keycodeconverter.getTapKeycode(props.keycode).label);
    setHoldValue(props.keycodeconverter.getHoldKeycode(props.keycode));
    setHoldInputValue(props.keycodeconverter.getHoldKeycode(props.keycode).label);
    setModsValue(props.keycodeconverter.getModifier(props.keycode));
    setKeycodeValue((props.keycode.value ?? 0).toString());
  }, [props.keycode]);
  return (
    <ClickAwayListener
      mouseEvent="onMouseDown"
      touchEvent="onTouchStart"
      onClickAway={() => props.onClickAway?.()}
    >
      <Popper
        open={props.open}
        anchorEl={props.anchor}
        placement="bottom-start"
      >
        <div className="key-select-popup">
          <Autocomplete
            value={tapValue}
            filterOptions={filterOptions}
            onChange={(_event, newValue) => {
              setTapValue(newValue ?? DefaultQmkKeycode);
              const newKeycode =
                props.keycodeconverter.combineKeycodes(
                  newValue ?? DefaultQmkKeycode,
                  holdValue,
                  modsValue
                ) ?? DefaultQmkKeycode;
              setKeycodeValue(newKeycode.value.toString());
              props.onChange?.({
                keymapkey: props.keymapKey,
                keycode: newKeycode,
              });
            }}
            inputValue={tapInputValue}
            onInputChange={(_event, newInputValue) => {
              setTapInputValue(newInputValue);
            }}
            options={props.keycodeconverter.getTapKeycodeList()}
            isOptionEqualToValue={(option, value) => {
              return option.value == value.value;
            }}
            getOptionKey={(option) => option.key}
            getOptionLabel={(option) => option.label}
            renderInput={(params) => (
              <TextField {...params} label="Base(Tap)" />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={props.key}>
                <div className="list-label">{option.label}</div>
                <div className="list-key">{option.key}</div>
              </Box>
            )}
          ></Autocomplete>

          <Autocomplete
            value={holdValue}
            filterOptions={filterOptions}
            onChange={(_event, newValue) => {
              setHoldValue(newValue ?? DefaultQmkKeycode);
              const newKeycode =
                props.keycodeconverter.combineKeycodes(
                  tapValue,
                  newValue ?? DefaultQmkKeycode,
                  modsValue
                ) ?? DefaultQmkKeycode;
              setKeycodeValue(newKeycode.value.toString());
              props.onChange?.({
                keymapkey: props.keymapKey,
                keycode: newKeycode,
              });
            }}
            inputValue={holdInputValue}
            onInputChange={(_event, newInputValue) => {
              setHoldInputValue(newInputValue);
            }}
            options={props.keycodeconverter.getHoldKeycodeList()}
            isOptionEqualToValue={(option, value) => {
              return option.value == value.value;
            }}
            getOptionKey={(option) => option.key}
            getOptionLabel={(option) => option.label}
            renderInput={(params) => (
              <TextField {...params} label="Option(Hold)" />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props} key={props.key}>
                <div className="list-label">{option.label}</div>
                <div className="list-key">{option.key}</div>
              </Box>
            )}
          ></Autocomplete>
          <FormGroup row>
            {(
              [
                { Ctrl: ModifierBit.Ctrl },
                { Shift: ModifierBit.Shift },
                { Alt: ModifierBit.Alt },
                { GUI: ModifierBit.GUI },
                { UseRight: ModifierBit.UseRight },
              ] as { [key: string]: ModifierBit }[]
            ).map((k, idx) => (
              <FormControlLabel
                key={idx}
                value={Object.keys(k)[0]}
                sx={{ margin: 1 }}
                control={
                  <Checkbox
                    checked={(modsValue & Object.values(k)[0]) !== 0}
                    onChange={(event) => {
                      const newMods = event.target.checked
                        ? modsValue | Object.values(k)[0]
                        : modsValue & ~Object.values(k)[0];
                      console.log(`new mods ${newMods}`);
                      setModsValue(newMods);
                      const newKeycode =
                        props.keycodeconverter.combineKeycodes(
                          tapValue,
                          holdValue,
                          newMods
                        ) ?? DefaultQmkKeycode;
                      setKeycodeValue(newKeycode.value.toString());
                      props.onChange?.({
                        keymapkey: props.keymapKey,
                        keycode: newKeycode,
                      });
                    }}
                    size="small"
                  ></Checkbox>
                }
                label={Object.keys(k)[0]}
                labelPlacement="top"
              ></FormControlLabel>
            ))}
          </FormGroup>
          <TextField
            label="Keycode(decimal)"
            variant="outlined"
            value={keycodeValue.toString()}
            onChange={(event) => {
              setKeycodeValue(event.target.value);
              const keycodeValue = parseInt(event.target.value);
              if (0 <= keycodeValue && keycodeValue <= 0xffff) {
                const keycode =
                  props.keycodeconverter.convertIntToKeycode(keycodeValue);
                setTapValue(props.keycodeconverter.getTapKeycode(keycode));
                setTapInputValue(
                  props.keycodeconverter.getTapKeycode(keycode).label
                );
                setHoldValue(props.keycodeconverter.getHoldKeycode(keycode));
                setHoldInputValue(
                  props.keycodeconverter.getHoldKeycode(keycode).label
                );
                setModsValue(props.keycodeconverter.getModifier(keycode));
                props.onChange?.({
                  keymapkey: props.keymapKey,
                  keycode:
                    props.keycodeconverter.convertIntToKeycode(keycodeValue),
                });
              }
            }}
          ></TextField>
        </div>
      </Popper>
    </ClickAwayListener>
  );
}