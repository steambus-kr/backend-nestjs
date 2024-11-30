# Steambus Backend

이전 Bun + ElysiaJS 로 구성된 [backend](https://github.com/steambus-kr/backend) 레포지토리에 있었던 메모리 누수 및 코드 구조 문제를 해결하기 위한 새로운 백엔드 레포지토리입니다.

NodeJS + NestJS를 사용합니다.

## 스크립트

- `yarn start` - 코드를 실행합니다.
- `yarn start:dev` - 코드를 실행하되, 내용이 변경되면 서버를 자동으로 재시작합니다.
- `yarn build` - 코드를 JavaScript로 트랜스파일합니다.
- `yarn start:prod` - 빌드한 JavaScript 코드를 NodeJS로 실행합니다.

## 개발

- MariaDB, NodeJS를 필요로 합니다.
- .env.example을 .env로 복사하고 필요한 내용을 채워야 합니다.
  - 필수 요소는 `DATABASE_URL`, `STEAM_KEY`, `ADMIN_KEY`입니다.

1. `yarn install`로 패키지를 설치합니다.
2. `yarn prisma migrate dev`로 PrismaORM을 이용해 MariaDB 환경을 구축합니다.
3. 이제 필요한 개발 환경이 설정되었습니다.

## 배포

- 최소 1GB 이상의 램을 필요로 합니다.
  - 기본적으로 약 500MB의 램을 사용하며, Cronjob의 실행에 따라 달라질 수 있습니다.

1. `yarn install`로 패키지를 설치합니다.
2. `yarn prisma migrate deploy`로 PrismaORM을 이용해 MariaDB 환경을 구축합니다.
3. `yarn prisma generate`로 PrismaORM Client를 생성합니다.
4. `yarn build`로 코드를 빌드합니다.
5. `yarn start:prod` 또는 `node dist/main.js`로 서버를 실행할 수 있습니다.
