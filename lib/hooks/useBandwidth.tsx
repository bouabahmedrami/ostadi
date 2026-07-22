"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { LowBandwidthSettings } from "@/lib/types";

interface BandwidthContextType {
  settings: LowBandwidthSettings;
  updateSettings: (s: Partial<LowBandwidthSettings>) => void;
  isLowBandwidth: boolean;
  networkSpeed: "fast" | "medium" | "slow" | "unknown";
}

const BandwidthContext = createContext<BandwidthContextType | null>(null);

export function BandwidthProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LowBandwidthSettings>({
    enabled: false,
    videoQuality: "medium",
    audioOnly: false,
  });
  const [networkSpeed, setNetworkSpeed] = useState<"fast" | "medium" | "slow" | "unknown">("unknown");

  useEffect(() => {
    // Load saved settings
    const saved = localStorage.getItem("ostadi-bandwidth");
    if (saved) setSettings(JSON.parse(saved));

    // Detect network speed via Navigator API
    detectNetwork();
  }, []);

  function detectNetwork() {
    const nav = navigator as any;
    if (nav.connection) {
      const conn = nav.connection;
      const effectiveType = conn.effectiveType;
      if (effectiveType === "4g") setNetworkSpeed("fast");
      else if (effectiveType === "3g") setNetworkSpeed("medium");
      else if (effectiveType === "2g" || effectiveType === "slow-2g") {
        setNetworkSpeed("slow");
        // Auto-enable low bandwidth mode on slow networks
        setSettings(prev => ({
          ...prev,
          enabled: true,
          videoQuality: "low",
        }));
      }

      conn.addEventListener("change", detectNetwork);
    }
  }

  function updateSettings(s: Partial<LowBandwidthSettings>) {
    setSettings(prev => {
      const updated = { ...prev, ...s };
      localStorage.setItem("ostadi-bandwidth", JSON.stringify(updated));
      return updated;
    });
  }

  return (
    <BandwidthContext.Provider value={{
      settings,
      updateSettings,
      isLowBandwidth: settings.enabled,
      networkSpeed,
    }}>
      {children}
    </BandwidthContext.Provider>
  );
}

export function useBandwidth() {
  const ctx = useContext(BandwidthContext);
  if (!ctx) throw new Error("useBandwidth must be inside BandwidthProvider");
  return ctx;
}
