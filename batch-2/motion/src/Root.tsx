import React from "react";
import { Composition } from "remotion";
import { Essentials, FPS, TOTAL } from "./Essentials";

// Portrait, phone-sized, 18 s. Rendered per language: --props='{"lang":"en"}'.
export const RemotionRoot: React.FC = () => (
  <Composition
    id="Essentials"
    component={Essentials}
    durationInFrames={TOTAL}
    fps={FPS}
    width={720}
    height={1280}
    defaultProps={{ lang: "en" as const }}
  />
);
