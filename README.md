# 습관 도장

매일의 기록과 달성을 한 장의 표로 보는 습관 기록 웹앱.

- 구글 계정 로그인 (Firebase Authentication)
- 기록은 `users/<본인 uid>/data/` 에만 저장, `firestore.rules` 로 본인만 읽고 쓰기
- 휴대폰 홈 화면에 추가해 앱처럼 사용 (PWA)
- 구글 시트로 내보내기 (drive.file 권한: 이 앱이 만든 파일에만 접근)

## 빌드

```
npm ci
npm run build:web     # 독립 웹사이트 → dist-web/
npm run build:claude  # Claude 아티팩트용 HTML 한 장 → dist/index.html
```

`firebase-config.json` 에 Firebase 웹 앱 설정값을 넣어야 합니다. (이 값은 공개되어도 괜찮고, 데이터 보호는 보안 규칙이 맡습니다.)

## 배포

`main` 브랜치에 올리면 GitHub Actions가 빌드해서 GitHub Pages에 배포합니다.
