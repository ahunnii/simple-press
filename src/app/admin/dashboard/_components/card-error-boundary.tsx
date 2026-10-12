"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

import { Button } from "~/components/ui/button";

type Props = {
  children: ReactNode;
  /** Called before a retry so the caller can reset failed queries. */
  onReset?: () => void;
};

type State = { failed: boolean };

/**
 * Per-card error boundary. A `useSuspenseQuery` failure would otherwise bubble
 * to the admin `error.tsx` and take the whole dashboard with it; here it costs
 * one card.
 */
export class CardErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Dashboard card failed to load", error, info.componentStack);
  }

  private retry = () => {
    this.props.onReset?.();
    this.setState({ failed: false });
  };

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div
        role="status"
        className="text-muted-foreground flex flex-1 flex-col items-start justify-center gap-2 text-sm"
      >
        <p>Couldn&apos;t load this card.</p>
        <Button variant="outline" size="sm" onClick={this.retry}>
          Try again
        </Button>
      </div>
    );
  }
}
