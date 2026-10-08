import { fieldAttr } from "~/lib/preview/section-attrs";
import { EmbedFrame } from "~/components/embed-frame";
import { VideoFacade } from "~/components/video-facade";

import {
  GloveButton,
  GloveOverline,
  GloveReveal,
  GloveSection,
} from "../shared";
import { gloveIsExternal } from "../steps/glove-links";

/** A validated story video, from `parseTemplateIframeValue`. */
export type GloveStoryVideo =
  | { kind: "youtube"; youtubeId: string; title: string }
  | { kind: "embed"; src: string; title: string; height: number };

type GloveHomeStoryProps = {
  overline: string;
  heading: string;
  video: GloveStoryVideo | null;
  bodyOne: string;
  bodyTwo: string;
  signoffName: string;
  signoffRole: string;
  buttonLabel: string;
  /** Empty hides the button (blank, or its route's feature is off). */
  buttonUrl: string;
  sectionAttrs?: Record<string, string>;
};

/** Decorative scalloped edge: paper rising into the bottom of the band. */
function BandWave() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 -bottom-px h-8 overflow-hidden text-[var(--glove-paper)] md:h-12"
      aria-hidden="true"
    >
      <svg
        className="block size-full rotate-180"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,0v99c22-20.6,28.7-69.7,61.4-69.7c18.8,0,29.1,16.2,38.6,34V0L0,0z" />
      </svg>
    </div>
  );
}

/**
 * Founder story: a lavender band inside the container with the story video
 * (click-to-play facade), two paragraphs, the founder's sign-off and a link to
 * the About page. The overline uses primary on lavender (a11y deviation from
 * the live site's white, which is 1.8:1).
 */
export function GloveHomeStory({
  overline,
  heading,
  video,
  bodyOne,
  bodyTwo,
  signoffName,
  signoffRole,
  buttonLabel,
  buttonUrl,
  sectionAttrs,
}: GloveHomeStoryProps) {
  return (
    <GloveSection
      aria-labelledby="glove-story-heading"
      sectionAttrs={sectionAttrs}
      padded={false}
      reveal={false}
      className="py-6 md:py-10"
    >
      <GloveReveal threshold={0}>
        <div className="relative overflow-hidden rounded-t-[var(--glove-radius-panel)] bg-[var(--glove-lavender)] px-5 pt-10 pb-20 text-[var(--glove-ink)] md:px-14 md:pt-14 md:pb-28">
          <div className="mx-auto max-w-[860px]">
            {overline ? (
              <GloveOverline fieldKey="glove.homepage.story-overline">
                {overline}
              </GloveOverline>
            ) : null}
            <h2
              id="glove-story-heading"
              className="glove-display mt-2 text-center text-[clamp(28px,3.6vw,45px)] leading-[1.2] font-semibold text-[var(--glove-ink)]"
              {...fieldAttr("glove.homepage.story-heading")}
            >
              {heading}
            </h2>

            {video ? (
              <div className="mx-auto mt-8 max-w-[860px] overflow-hidden rounded-md shadow-[var(--glove-shadow-md)]">
                {video.kind === "youtube" ? (
                  <VideoFacade
                    youtubeId={video.youtubeId}
                    title={video.title || "The story video"}
                    thumbnailUrl={`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                  />
                ) : (
                  <EmbedFrame
                    src={video.src}
                    title={video.title || "The story video"}
                    height={video.height}
                  />
                )}
              </div>
            ) : null}

            <div className="glove-body mt-8 max-w-[75ch] text-[clamp(17px,1.5vw,20px)] leading-[1.75] md:mt-10">
              {bodyOne ? (
                <p
                  className="mb-5"
                  {...fieldAttr("glove.homepage.story-body-1")}
                >
                  {bodyOne}
                </p>
              ) : null}
              {bodyTwo ? (
                <p
                  className="mb-5"
                  {...fieldAttr("glove.homepage.story-body-2")}
                >
                  {bodyTwo}
                </p>
              ) : null}
              {signoffName || signoffRole ? (
                <p className="mb-6">
                  {signoffName ? (
                    <strong
                      className="font-bold"
                      {...fieldAttr("glove.homepage.story-signoff-name")}
                    >
                      {signoffName}
                    </strong>
                  ) : null}
                  {signoffName && signoffRole ? <br /> : null}
                  {signoffRole ? (
                    <em {...fieldAttr("glove.homepage.story-signoff-role")}>
                      {signoffRole}
                    </em>
                  ) : null}
                </p>
              ) : null}
            </div>

            {buttonLabel && buttonUrl ? (
              <GloveButton
                href={buttonUrl}
                external={gloveIsExternal(buttonUrl)}
                size="md"
              >
                <span {...fieldAttr("glove.homepage.story-button-label")}>
                  {buttonLabel}
                </span>
              </GloveButton>
            ) : null}
          </div>
          <BandWave />
        </div>
      </GloveReveal>
    </GloveSection>
  );
}
