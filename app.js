const express = require('express');
const redis = require('redis');
const os = require('os');

const app = express();
const port = 3000;

const { Kafka } = require('kafkajs');
const kafka = new Kafka({
  clientId: 'my-app',
  // 도커 네트워크 내부에서는 반드시 '서비스명:포트' 형식을 써야 합니다.
  brokers: ['my-kafka:29092'], 
  connectionTimeout: 3000,
  retry: {
    initialRetryTime: 100,
    retries: 10
  }
});

const producer = kafka.producer();

// 서버 시작 시 미리 연결 시도 (에러 방지)
const initKafka = async () => {
    try {
        await producer.connect();
        console.log("✅ Kafka Producer Connected");
    } catch (err) {
        console.error("❌ Kafka Connection Error:", err);
    }
};

initKafka();

// 1. Docker Compose에서 설정한 Redis 호스트로 연결
const redisClient = redis.createClient({
    url: `redis://${process.env.REDIS_HOST}:6379`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.connect();

// 2. 로그인 처리 (간단히 이름만 저장)
app.get('/login', async (req, res) => {
    const userName = "Seo Gi Beom"; // 서기범님 이름 고정
    await redisClient.set('session_user', userName);
    res.send(`<h1>Hello ${userName}! 로그인 성공!</h1><p>이제 <a href="/">메인 페이지</a>로 가보세요.</p>`);
});

// 3. 메인 페이지 (로그인 상태 확인)
app.get('/', async (req, res) => {
    const serverId = os.hostname(); // 현재 컨테이너의 이름(ID)
    const loggedInUser = await redisClient.get('session_user');

    let html = `<h1>서기범님, 고가용성 & Redis 실습</h1>`;
    html += `<p>📡 현재 응답한 서버 ID (컨테이너): <strong>${serverId}</strong></p>`;

    if (loggedInUser) {
        html += `<p>✅ 로그인 상태: <strong>${loggedInUser}님 로그인 중</strong></p>`;
        html += `<p>초강력 새로고침(Ctrl+Shift+R)을 눌러 다른 서버가 응답해도 이 메시지가 유지되는지 확인하세요!</p>`;
    } else {
        html += `<p>❌ 로그인 상태: <strong>로그아웃됨</strong></p>`;
        html += `<p><a href="/login">여기서 로그인</a>을 먼저 해주세요.</p>`;
    }

    // [추가] Kafka에 방문 기록 던지기 (비동기)
    await producer.connect();
    await producer.send({
        topic: 'visit-log',
        messages: [{ value: `${serverId} 서버에 방문자가 왔습니다!` }],
    });

    res.send(html);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});