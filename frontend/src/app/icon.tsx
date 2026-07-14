import { ImageResponse } from "next/og";
import StatusTimerSonarMark from "@/components/brand/StatusTimerSonarMark";

export const size = {
  width: 96,
  height: 96,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0614",
        }}
      >
        <StatusTimerSonarMark />
      </div>
    ),
    {
      ...size,
    },
  );
}
