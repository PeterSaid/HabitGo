import React from 'react';
import { ErrorState } from '../ui/components';

/** App-wide crash guard (spec §87): never show a blank screen or a stack trace. */
export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; key: number }
> {
  state = { hasError: false, key: 0 };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error);
  }

  reset = () => this.setState((s) => ({ hasError: false, key: s.key + 1 }));

  render() {
    if (this.state.hasError) {
      return <ErrorState onRetry={this.reset} />;
    }
    return <React.Fragment key={this.state.key}>{this.props.children}</React.Fragment>;
  }
}
