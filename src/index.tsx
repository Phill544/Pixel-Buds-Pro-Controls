import {
  PanelSection,
  PanelSectionRow,
  DropdownItem,
  Field,
  ButtonItem,
  definePlugin,
  staticClasses,
} from "@decky/ui";
import { callable } from "@decky/api";
import { useState, useEffect, useCallback, FC } from "react";
import { FaHeadphones, FaSyncAlt } from "react-icons/fa";

interface BatteryInfo {
  left: number;
  right: number;
  case: number;
  left_charging: boolean;
  right_charging: boolean;
  case_charging: boolean;
}

const getBattery = callable<[], BatteryInfo>("get_battery");
const getAnc = callable<[], string>("get_anc");
const setAnc = callable<[mode: string], boolean>("set_anc");

const ANC_OPTIONS = [
  { data: "off", label: "Off" },
  { data: "active", label: "Noise Cancellation" },
  { data: "aware", label: "Transparency" },
];

function batteryLabel(percent: number, charging: boolean): string {
  if (percent < 0) return "--";
  const icon = charging ? " ⚡" : "";
  return `${percent}%${icon}`;
}

function batteryColor(percent: number): string {
  if (percent < 0) return "#999";
  if (percent <= 10) return "#e74c3c";
  if (percent <= 25) return "#f39c12";
  return "#2ecc71";
}

const BatteryRow: FC<{ label: string; percent: number; charging: boolean }> = ({
  label,
  percent,
  charging,
}) => (
  <PanelSectionRow>
    <Field
      label={label}
      bottomSeparator="none"
    >
      <span style={{ color: batteryColor(percent), fontWeight: "bold" }}>
        {batteryLabel(percent, charging)}
      </span>
    </Field>
  </PanelSectionRow>
);

const Content: FC = () => {
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [ancMode, setAncMode] = useState<string>("off");
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    try {
      const bat = await getBattery();
      setBattery(bat);
      setConnected(true);
      const anc = await getAnc();
      setAncMode(anc);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (loading) {
    return (
      <PanelSection title="Pixel Buds Pro">
        <PanelSectionRow>
          <Field label="Status">Connecting...</Field>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  if (!connected) {
    return (
      <PanelSection title="Pixel Buds Pro">
        <PanelSectionRow>
          <Field label="Status">Not connected</Field>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={refresh}>
            <FaSyncAlt style={{ marginRight: 8 }} />
            Retry Connection
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    );
  }

  return (
    <>
      <PanelSection title="Battery">
        <BatteryRow
          label="Left Bud"
          percent={battery?.left ?? -1}
          charging={battery?.left_charging ?? false}
        />
        <BatteryRow
          label="Right Bud"
          percent={battery?.right ?? -1}
          charging={battery?.right_charging ?? false}
        />
        <BatteryRow
          label="Case"
          percent={battery?.case ?? -1}
          charging={battery?.case_charging ?? false}
        />
      </PanelSection>
      <PanelSection title="Noise Control">
        <PanelSectionRow>
          <DropdownItem
            label="ANC Mode"
            rgOptions={ANC_OPTIONS}
            selectedOption={ancMode}
            onChange={async (option) => {
              const mode = option.data as string;
              setAncMode(mode);
              await setAnc(mode);
            }}
          />
        </PanelSectionRow>
      </PanelSection>
      <PanelSection>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={refresh}>
            <FaSyncAlt style={{ marginRight: 8 }} />
            Refresh
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    </>
  );
};

export default definePlugin(() => {
  return {
    name: "Pixel Buds Pro",
    titleView: (
      <div className={staticClasses.Title}>
        <FaHeadphones style={{ marginRight: 8 }} />
        Pixel Buds Pro
      </div>
    ),
    content: <Content />,
    icon: <FaHeadphones />,
    onDismount() {},
  };
});
