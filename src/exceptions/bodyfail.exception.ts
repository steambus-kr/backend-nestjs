export class BodyFailException extends Error {
  /**
   * 성공 상태로 응답했으나 응답의 본문에서 실패임이 감지되었을 경우 이 오류를 발생시킵니다.
   */
  constructor(message?: string) {
    super(message);
  }
}
