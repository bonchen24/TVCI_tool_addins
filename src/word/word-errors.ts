export class WordOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WordOperationError";
  }
}

export class MissingContentControlError extends WordOperationError {
  constructor(tag: string) {
    super(`Không tìm thấy trường biểu mẫu: ${tag}`);
    this.name = "MissingContentControlError";
  }
}
