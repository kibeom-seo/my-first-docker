# 1. 가벼운 웹 서버(Nginx)를 기반으로 합니다.
#FROM nginx:alpine
# 2. 우리가 만든 html 파일을 도커 안의 웹 경로로 복사합니다.
#COPY index.html /usr/share/nginx/html/index.html

# 1. Node.js 이미지를 기반으로 합니다.
FROM node:18-alpine

# 2. 컨테이너 안의 작업 폴더 설정
WORKDIR /app

# 3. 필요한 라이브러리 설치 (Express, Redis)
RUN npm install express redis kafkajs

# 4. 우리가 짠 app.js 파일을 복사
COPY app.js .

# 5. 3000번 포트로 서비스
EXPOSE 3000

# 6. 서버 실행 명령어
CMD ["node", "app.js"]