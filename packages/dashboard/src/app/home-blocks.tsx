// What each feature brings to Home, put together here so that Home never
// imports another feature: Factory's product line, what waits, the loop and
// the reviews; Explorations' ideas being explored; Signals' reports. Home
// shows those of the installed extensions, as each one's declaration says.

import { ExploringBlock } from "@/features/explorations/home-block";
import {
  LoopBlock,
  ReviewsBlock,
  StatusBlock,
  WaitingBlock,
} from "@/features/factory/home-blocks";
import type { FeatureBlocks } from "@/features/home/home-page";
import { SignalsBlock } from "@/features/signals/home-block";

export const featureBlocks: FeatureBlocks = ({ state, input, waiting }) => ({
  status: <StatusBlock state={state} />,
  waiting: <WaitingBlock waiting={waiting} />,
  loop: <LoopBlock input={input} state={state} />,
  exploring: <ExploringBlock input={input} addOns={state.addOns} />,
  signals: <SignalsBlock input={input} addOns={state.addOns} />,
  reviews: <ReviewsBlock waiting={waiting} addOns={state.addOns} />,
});
