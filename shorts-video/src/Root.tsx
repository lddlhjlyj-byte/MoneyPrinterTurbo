import { Composition, Still } from "remotion";
import { Banner, Profile, Thumbnail } from "./Assets";
import script from "./script.json";
import cards from "./cards.json";
import { InfoCard, calculateInfoCardMetadata } from "./InfoCard";
import { Captioned, calculateCaptionedMetadata } from "./Captioned";
import { calculateShortsMetadata, FPS, Shorts } from "./Shorts";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Shorts"
        component={Shorts}
        durationInFrames={90}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={script}
        calculateMetadata={calculateShortsMetadata}
      />
      <Composition
        id="Captioned"
        component={Captioned}
        durationInFrames={90}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ video: "input.mp4", captions: "captions.json" }}
        calculateMetadata={calculateCaptionedMetadata}
      />
      <Composition
        id="InfoCard"
        component={InfoCard}
        durationInFrames={90}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={cards as never}
        calculateMetadata={calculateInfoCardMetadata}
      />
      <Still id="Profile" component={Profile} width={800} height={800} />
      <Still id="Banner" component={Banner} width={2560} height={1440} />
      <Still id="Thumbnail" component={Thumbnail} width={1080} height={1920} />
    </>
  );
};
