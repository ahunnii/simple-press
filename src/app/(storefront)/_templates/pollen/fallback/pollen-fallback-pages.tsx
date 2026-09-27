/**
 * Pollen fallback page wrappers.
 *
 * Pollen's header is fixed-position and 112px tall (h-28). The Default
 * fallback pages use pt-16/pt-20 top padding, which doesn't clear the
 * header. These thin wrappers offset them with an additional pt-28
 * container so content renders below the header.
 */

import type { ComponentProps } from "react";
import { DefaultEventsPage } from "../../default/events/default-events-page";
import { DefaultEventPage } from "../../default/events/default-event-page";
import { DefaultDonatePage } from "../../default/donate/default-donate-page";
import { DefaultVideosPage } from "../../default/videos/default-videos-page";
import { DefaultFaqPage } from "../../default/faq/default-faq-page";

export function PollenEventsPage(
  props: ComponentProps<typeof DefaultEventsPage>,
) {
  return (
    <div className="pt-28">
      <DefaultEventsPage {...props} />
    </div>
  );
}

export function PollenEventPage(
  props: ComponentProps<typeof DefaultEventPage>,
) {
  return (
    <div className="pt-28">
      <DefaultEventPage {...props} />
    </div>
  );
}

export function PollenDonatePage(
  props: ComponentProps<typeof DefaultDonatePage>,
) {
  return (
    <div className="pt-28">
      <DefaultDonatePage {...props} />
    </div>
  );
}

export function PollenVideosPage(
  props: ComponentProps<typeof DefaultVideosPage>,
) {
  return (
    <div className="pt-28">
      <DefaultVideosPage {...props} />
    </div>
  );
}

export function PollenFaqPage(props: ComponentProps<typeof DefaultFaqPage>) {
  return (
    <div className="pt-28">
      <DefaultFaqPage {...props} />
    </div>
  );
}
