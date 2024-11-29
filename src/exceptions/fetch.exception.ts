/**
 * 실패할 경우 진행이 불가능한 Fetch에서 Retry가 불가능한 HTTP 코드로 응답했을 경우 이 오류를 발생시킵니다.
 */
export class FetchException extends Error {}
