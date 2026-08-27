# 타오운세(taoist.co.kr) 서버 운영 & 배포 런북

> 2026-07-11~12 카페24 → 오라클 클라우드 이전 작업 기록.
> 서버 접속·배포·기동·장애대응을 한 곳에. 문제 생기면 **[9. 트러블슈팅]** 부터 보면 됨.

---

## 1. 개요 — 지금 무엇이 어디서 도나

| 구분 | 내용 |
|---|---|
| 사이트 | **taoist.co.kr** (+ www) |
| 앱 스택 | **Nuxt 3 (Node.js SSR)** — nitro node-server 번들 |
| DB | **Supabase (외부 관리형 PostgreSQL)** — 서버엔 DB 없음, .env 키로 접속 |
| 결제 | 토스페이먼츠 (라이브 모드) |
| AI 운세 | DeepSeek API (`deepseek-v4-flash`), 스트리밍(SSE) |
| **라이브 서버** | **오라클 클라우드 `64.110.97.120`** (2026-07-12~) |
| 옛 서버(임시 다리) | 카페24 VPS `1.234.20.119` — **2026-07-14 만료**, 그 후 오라클 단독 |
| DNS | Cloudflare 관리, apex+www A레코드 → `64.110.97.120`, TTL 300초. **MX는 카페24 메일 유지(건드리지 말 것)** |

빌드는 **항상 로컬 맥**(`/Users/taoist/works/fortune`)에서. 서버에선 빌드 금지(아래 dnf 함정 참고).

---

## 2. 서버 접속

```bash
# 오라클 (라이브)
KEY=/Users/taoist/works/fortune/Oracle_Cloud/ssh-key-2026-07-10.key
chmod 600 "$KEY"                     # 권한 600 아니면 접속 거부
ssh -i "$KEY" opc@64.110.97.120       # 비root, sudo 무암호

# 카페24 (옛 서버, 만료 전까지)
ssh root@1.234.20.119                  # 키 등록돼 있으면 무암호
```

- 오라클 OS: Oracle Linux 9, 1 OCPU / 1GB RAM / 30GB 디스크 / 스왑 2GB(`/​.swapfile`, fstab 등록).
- node **v22.22.3** (카페24와 동일). 오라클엔 dnf 대신 **공식 tarball로 `/usr/local`에 설치 → `/usr/bin/{node,npm,npx}` 심볼릭**(sudo/systemd가 찾게).

---

## 3. 앱 구조 & 기동 방식

서버 앱 디렉토리: **`/home/opc/taounse/`** (오라클) / `/root/taounse/` (카페24)
```
taounse/
  .output/          ← nuxt build 산출물 (rsync 대상, 유일하게 갱신)
  .env              ← 프로덕션 시크릿 (절대 덮어쓰지 말 것)
  start.sh          ← 기동 스크립트
  mem-guard.sh      ← (오라클) 메모리 선제 가드
```

**start.sh** (핵심 — .env 로드 후 nitro 실행):
```bash
#!/bin/bash
set -a; source /home/opc/taounse/.env; set +a
export HOST=127.0.0.1
export PORT=3000
exec node /home/opc/taounse/.output/server/index.mjs
```

- **pm2**가 `start.sh`를 앱명 **`taounse`** 로 구동 (fork 모드).
- nginx가 앞단에서 **80/443 → 127.0.0.1:3000** 리버스 프록시. Let's Encrypt SSL(자동갱신).

### 기동/상태/재시작 (오라클, opc로)
```bash
pm2 list                         # 상태
pm2 restart taounse              # 재시작(in-place, 안전)
pm2 logs taounse --lines 50      # 로그
pm2 pid taounse                  # PID
```

### 부팅 자동시작 (systemd oneshot)
```bash
systemctl status pm2-opc          # 부팅 시 pm2 resurrect 실행
# 유닛: /etc/systemd/system/pm2-opc.service  (Type=oneshot, RemainAfterExit=yes)
# 앱 구성 바꾸면 반드시: pm2 save  (dump.pm2 갱신 → 재부팅 복구에 반영)
```
⚠️ pm2 기본 `pm2 startup`이 만든 유닛은 PIDFile 문제로 **90초마다 재시작 플랩**을 일으킴 → oneshot으로 교체함(아래 트러블슈팅 참고).

---

## 4. 배포 절차 (로컬 빌드 → rsync → reload)

```bash
cd /Users/taoist/works/fortune
KEY=Oracle_Cloud/ssh-key-2026-07-10.key

# 1) 라이브 빌드 — PAYMENT_MODE=live 필수! (안 주면 .env의 test로 구워져 실결제 깨짐)
PAYMENT_MODE=live npm run build

# 2) .output 스테이징 전송
rsync -az --delete -e "ssh -i $KEY" .output/ opc@64.110.97.120:/home/opc/taounse/.output.new/

# 3) 서버에서 백업 후 교체 + reload
ssh -i $KEY opc@64.110.97.120 'cd /home/opc/taounse && rm -rf .output.prev && mv .output .output.prev && mv .output.new .output && pm2 reload taounse --update-env'

# 4) 검증
curl -s -o /dev/null -w "%{http_code}\n" https://taoist.co.kr/fortune/today/rat   # 200 기대
# 결제 페이지에 live_ck 실렸는지: 프리미엄 결과 HTML에서 live_ck 검색
```
**롤백**: `mv .output .output.bad && mv .output.prev .output && pm2 reload taounse`

---

## 5. nginx 설정 (중요 — 오라클 필수 항목)

`/etc/nginx/conf.d/taounse.conf` 의 핵심. 아래가 **빠지면 특정 상황에서 502/스트림끊김** 발생(직접 겪음):

```nginx
server {
    server_name taoist.co.kr www.taoist.co.kr;
    client_max_body_size 10m;

    # (A) 로그인 세션 쿠키(큰 JWT) 502 방지 — 없으면 로그인 사용자만 502
    proxy_buffer_size 16k;
    proxy_buffers 8 16k;
    proxy_busy_buffers_size 32k;

    # (B) AI 운세 SSE 스트리밍 경로
    location /api/fortune/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header Connection '';      # ★ 없으면 SSE가 첫 토큰 대기중 끊김
        proxy_buffering off;                  # ★ SSE 필수
        proxy_cache off;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_read_timeout 120s;
    }
    # 443 ssl ... (certbot 관리)
}
```
적용: `sudo nginx -t && sudo systemctl reload nginx`
- 임시 진단용 `/api/fortune/_ssetest`는 nginx에서 404 차단해둠. **2026-08-27 코드에서도 삭제 완료** — nginx 차단 규칙은 이중 안전장치로 그대로 둔다.
- SSL: `sudo certbot --nginx -d taoist.co.kr -d www.taoist.co.kr` (자동갱신 등록됨).

---

## 6. 안정성 장치 (오라클 전용 — 카페24엔 없던 것)

| 장치 | 위치/명령 | 역할 |
|---|---|---|
| OCI 에이전트 **비활성** | `systemctl disable --now oracle-cloud-agent oracle-cloud-agent-updater` | ★반복 다운의 근본원인 제거(램 ~186MB 회수). 콘솔 모니터링 기능만 상실 |
| 메모리 선제 가드 | `/home/opc/taounse/mem-guard.sh` (crontab 매분) | 여유<110MB면 스래싱 전에 `pm2 restart` 선제 → 자동회복. 로그: `mem-guard.log` |
| swappiness | `/etc/sysctl.d/99-swappiness.conf` = 10 | 스왑 늦게 써서 스래싱 지연 |
| pm2 메모리 한도 | `pm2 start ... --max-memory-restart 450M` | 앱 450MB 초과시 재시작 |
| kdump 회수 | `crashkernel=no`(grubby) + kdump disable | 1GB에서 448MB 예약하던 것 회수(영구) |

---

## 7. 방화벽 / 보안

- **firewalld** active. 개방: `sudo firewall-cmd --permanent --add-service=http --add-service=https && sudo firewall-cmd --reload` (ssh는 기본 허용).
- **SELinux Enforcing** → nginx 프록시 위해 `sudo setsebool -P httpd_can_network_connect 1` **필수**(안 하면 502).
- **VCN 보안목록**(OCI 콘솔)은 80/443 이미 허용돼 있음.

---

## 8. DNS / 도메인

- 관리처 **Cloudflare**. apex(`taoist.co.kr`)+`www` A레코드 → `64.110.97.120`. TTL 300초.
- **MX는 카페24 메일서버 유지** — 절대 건드리지 말 것(메일 죽음).
- 전환/전파: 옛 레코드 TTL이 길면 캐시된 리졸버(일부 ISP)가 옛 IP를 오래 붙잡음 → **옛 서버(카페24)를 전파 끝날 때까지 켜둘 것**(이번에 성급히 꺼서 캐시된 고객 접속불가 겪음).
- 브라우저별 차이: 크롬은 자체 Secure DNS(DoH) 씀 → OS DNS와 다른 서버로 갈 수 있음(디버깅 시 유의).

---

## 9. 트러블슈팅 (이번에 실제 겪은 것 → 원인 → 해결)

### 9-1. AI 운세 "운세를 불러오지 못했어요" (SSE 끊김) + 결제확정 502
- 증상: 명식/사주표는 나오는데 맨 아래 AI 풀이만 실패. curl·비로그인은 정상.
- 원인: nginx `/api/fortune/` 에 **`proxy_set_header Connection '';` 누락**. meta 전송 후 DeepSeek 첫 토큰 기다리는 무음 구간에 nginx↔Node keep-alive가 끊김.
- 해결: 위 [5]의 (B) 블록(Connection '' + buffering off + timeout 300s).

### 9-2. 로그인 사용자만 502 (`upstream sent too big header`)
- 증상: 크롬(로그인 세션)만 502, 사파리/비로그인 정상. `nginx/1.20.1`(=오라클) 502.
- 원인: Supabase 세션 쿠키(큰 chunked JWT)가 nginx 기본 헤더버퍼(4~8k) 초과.
- 해결: 위 [5]의 (A) `proxy_buffer_size 16k` 등.

### 9-3. ★★몇 시간마다 서버 먹통 (SSH 배너 타임아웃, 사이트 무응답) — 가장 오래 시달린 문제
- 증상: 포트는 열리는데 HTTPS/SSH 응답 없음. 앱은 크래시 안 함, **dmesg에 OOM 없음**. 같은 1GB 카페24는 멀쩡. 얼어붙으면 SSH 막혀 현장진단 불가 → 콘솔 재부팅만 답.
- **여러 원인이 겹침. OL9에만 있고 카페24(Ubuntu)엔 없는 주기적/상시 메모리 소비자들:**
  1. **OCI 관리 에이전트**(`oracle-cloud-agent`+`gomon`/`oci-wlp`/`runcommand`/python): 상시 ~186MB.
  2. **★`dnf-makecache.timer`**: OL9 기본이 **1~2시간마다** dnf로 전체 저장소 메타데이터 로드(=dnf는 이 박스 스래싱의 원인, 9-4 참고). **먹통 버스트 시각(예 01:02, 02:59 ~2h 간격)과 일치** → 가장 유력한 주기적 트리거.
  3. **PCP 성능수집**(`pmcd`/`pmlogger`/`pmie`, pmdaopenmetrics ~35MB + 몇 분마다 타이머).
- **본질**: 위 것들이 여유 메모리를 잠식/스파이크 → **OOM 아니라 스왑 스래싱(얼어붙음)**(그래서 pm2·dmesg가 못 잡음). ⚠️mem-guard의 `pm2 restart`가 신·구 프로세스 겹쳐 메모리 두 배 → **cascade로 증폭**(3연발이 증거) → mem-guard 제거함.
- **근본 조치(적용됨):**
  ```bash
  sudo systemctl disable --now oracle-cloud-agent oracle-cloud-agent-updater   # 상시 186MB
  sudo systemctl disable --now dnf-makecache.timer                              # ★주기적 dnf 스파이크 제거(핵심)
  sudo systemctl disable --now pmcd pmlogger pmie pmproxy                       # PCP 제거
  # start.sh에 NODE_OPTIONS="--max-old-space-size=400" → 앱이 램 전체 못 먹음.
  #   힙 초과시 박스 먹통 대신 앱만 JS heap OOM 크래시 → pm2 자동재시작(cascade 없음)
  sudo mkdir -p /var/log/journal && sudo systemctl restart systemd-journald     # 영구저널(재발시 journalctl -k -b -1로 OOM 확인)
  ```
- 복구: 먹통이면 **OCI 콘솔 Reboot**. 부팅 시 oneshot이 앱 자동복구. 재발 조사는 `mem-guard.log`(있으면)·`journalctl -k -b -1`부터.
- 그래도 재발하면 → **버스터블 마이크로의 CPU 조임 가능성** → 오라클 **Ampere A1(무료 4코어/24GB, ARM)** 이전 검토([10]).

### 9-4. 저사양(1vCPU/1GB) 박스에서 dnf가 스래싱 → 먹통
- 원인: dnf가 전체 저장소 메타데이터를 램에 올려 스왑 스래싱(load 22까지). 2회 재부팅 겪음.
- 회피: ①node는 dnf 말고 **공식 tarball** ②nginx/certbot은 `--disablerepo="*" --enablerepo=ol9_appstream --enablerepo=ol9_baseos_latest`(필요시 `ol9_developer_EPEL`)로 **저장소 2~3개만** ③**dnf 동시실행/동시 ssh 폭주 금지, 한 번에 하나 detached+단일감시**. **서버에서 빌드 금지.**

### 9-5. pm2 90초마다 재시작(플랩) → 간헐 502
- 원인: `pm2 startup`이 만든 systemd 유닛의 PIDFile을 systemd가 못 읽음(SELinux) → 시작확인 실패 타임아웃(90초) 반복.
- 해결: 유닛을 **Type=oneshot + RemainAfterExit=yes**(ExecStart=`pm2 resurrect`)로 교체.

### 9-6. 결제는 됐는데 실패창 / 주문 미완료
- 원인: 위 9-1/9-3의 502로 `/api/pay/confirm` 응답을 못 읽음. **토스엔 결제 DONE(정상)인데 우리 DB 주문만 pending**.
- 확인(읽기전용): `curl https://api.tosspayments.com/v1/payments/{paymentKey} -H "Authorization: Basic $(echo -n ${TOSS_SECRET_KEY_LIVE}: | base64)"` → status(DONE/IN_PROGRESS/CANCELED).
  - **DONE** = 실제 청구됨 → 주문 복구(paid 처리) 또는 환불 필요.
  - **IN_PROGRESS** = 미확정 → 방치 시 토스가 자동취소(청구 안 됨).

### 9-7. 결제가 test 모드로 나감(실결제 안 됨)
- 원인: `npm run build`(PAYMENT_MODE 미지정)로 빌드 → .env의 `PAYMENT_MODE=test`가 구워짐. 키는 **빌드 시점**에 박힘.
- 해결: **항상 `PAYMENT_MODE=live npm run build`.**

---

## 10. 미결/후속 (TODO)
- [x] 임시 진단 엔드포인트 제거: `server/api/fortune/_ssetest.get.ts` **삭제 완료(2026-08-27)** → 재빌드/재배포 필요.
- [ ] premium-stream의 `console.error`(:297) 정리 여부 판단 — 생성 실패 경로의 정상적인 에러 로깅이라 남겨둠. 불필요하다고 판단되면 그때 제거.
- [ ] 1차 결제 2000원(paymentKey `taois2026071122232747917`, 토스 DONE) 주문 복구 또는 환불.
- [ ] 메모리 장기 안정 최종 확인(에이전트 제거 효과) → 안정 확정.
- [ ] 2026-07-14 카페24 만료 → 오라클 단독 확인, 카페24 정리.
- [ ] (선택) 부하 여유 더 원하면 오라클 Ampere A1(무료 4코어/24GB, ARM이라 arm64 재빌드 필요) 검토.

---
_최종 갱신: 2026-07-12. 관련 클로드 메모리: oracle-migration, deploy-method._
