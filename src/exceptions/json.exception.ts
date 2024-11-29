export class JsonException extends Error {
  /**
   * JSON과 관련된 오류가 발생했을 경우 이 오류를 발생시킵니다.
   */
  constructor(message?: string) {
    super(message);
  }
}
