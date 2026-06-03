# 타오운세 2.0

Nuxt 3 + Supabase 기반 운세 서비스.

## 스택

- [Nuxt 3](https://nuxt.com)
- [@nuxtjs/supabase](https://supabase.nuxtjs.org)

## 설정

```bash
# 의존성 설치
npm install

# 환경변수 설정 (.env.example 복사 후 값 채우기)
cp .env.example .env
```

## 개발 서버

```bash
npm run dev
```

`http://localhost:3000` 에서 확인.

> macOS에서 vite-node 소켓 경로 길이 제한(104바이트) 때문에 `dev` 스크립트에 `TMPDIR=/tmp`를 지정해두었습니다.

## 빌드

```bash
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
```
