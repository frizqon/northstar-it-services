import { Component, type ComponentChildren, type JSX } from 'preact';

interface ErrorBoundaryProps {
  children: ComponentChildren;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error(
      JSON.stringify({
        event: 'ui_error',
        errorName: error.name,
        errorMessage: error.message
      })
    );
  }

  render(): JSX.Element {
    if (this.state.error) {
      return (
        <div class="error-boundary" role="alert">
          <span class="section-kicker">UNEXPECTED ERROR</span>
          <h2>Something went wrong.</h2>
          <p>Reload the page to try again. Your saved content is not affected.</p>
          <button
            type="button"
            class="button button-dark"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }

    return <>{this.props.children}</>;
  }
}
