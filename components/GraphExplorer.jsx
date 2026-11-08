"use client";

import GraphPlot from "./GraphPlot";
import GraphSonification from "./GraphSonification";

/** Share the keyboard position between the plot marker and audio controls. */
export default function GraphExplorer({
  graph, showPoints = true, onPositionChange,
}) {
  return (
    <GraphSonification graph={graph} onPositionChange={onPositionChange}>
      {(point) => (
        <GraphPlot graph={graph} showPoints={showPoints}
          selectedPoint={point} />
      )}
    </GraphSonification>
  );
}
