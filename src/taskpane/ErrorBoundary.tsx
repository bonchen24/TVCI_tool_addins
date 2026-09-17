import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <main className="startupError" role="alert">
          <h1>Không thể mở bộ công cụ biểu mẫu</h1>
          <p>Task pane gặp lỗi khi khởi tạo. Hãy tải lại rồi thử lại thao tác.</p>
          <button className="primary" type="button" onClick={this.handleReload}>Tải lại</button>
        </main>
      );
    }

    return this.props.children;
  }
}

