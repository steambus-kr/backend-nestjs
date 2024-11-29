/**
 * 재시도 횟수가 최대 횟수를 초과해 더 이상 재시도할 수 없는 경우 이 오류를 발생시킵니다.
 */
export class MaxRetryException extends Error {}
