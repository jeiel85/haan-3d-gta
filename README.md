# 🚗 GTA: 하안사거리 (GTA: Haan Sageori)

> **경기도 광명시 하안사거리**를 배경으로 펼쳐지는 웹 3D 오픈월드 액션 드라이빙 게임!  
> **Three.js & WebGL & Web Audio API** 기반으로 별도의 설치 없이 브라우저에서 즉시 60FPS로 즐길 수 있습니다.

[![Live Demo](https://img.shields.io/badge/🎮%20Live%20Demo-Play%20Now-ffaa00?style=for-the-badge&logo=google-chrome&logoColor=white)](https://jeiel85.github.io/haan-3d-gta/)
[![Three.js](https://img.shields.io/badge/Three.js-r174-black?style=for-the-badge&logo=three.js)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)

---

## 🌐 라이브 데모 (Live Demo)
👉 **[지금 바로 플레이하기: https://jeiel85.github.io/haan-3d-gta/](https://jeiel85.github.io/haan-3d-gta/)**

---

## 🏙️ 게임 소개 & 하안사거리 무대 고증

광명시의 핵심 상권이자 학원가, 주거 복합 중심지인 **하안사거리(오리로 ↔ 하안로 교차로)**를 3D 오픈월드로 완벽히 재현했습니다!

- **📍 대형 4거리 교차로 & 횡단보도**:
  - 왕복 6차선 오리로와 하안로 교차로
  - 4방향 횡단보도와 보행 신호등, 버스 전용 쉘터 ("하안사거리 정류장")
- **🏢 리얼 한글 간판 & 상업 타워**:
  - **하안 골든타워 & 학원가**: KB국민은행 하안사거리점, 하안 대성입시학원, 눈높이 러닝센터, 다이소 하안점, 온누리 대형약국
  - **하안 프라자**: 올리브영(OLIVE YOUNG) 하안사거리점, 파리바게뜨, 배스킨라빈스, 24시 코인노래방, 긱스타 PC카페
  - **하안 메디컬 스퀘어**: 신한은행, 메가MGC커피, 하안탑 수학전문학원, 하안이비인후과·내과
  - **하안 커머셜 타워**: 우리은행, 하나은행, 롯데리아, 써브웨이
- **🏘️ 외곽 주거지 실루엣**:
  - 하안주공 7단지, 8단지, 10단지, 12단지 고층 아파트 단지 배치

---

## ✨ 핵심 게임플레이 특징 (Key Features)

### 1. 🚗 5종의 개성 넘치는 한국형 차량 라인업
- **현대 쏘나타 세단**: 부드러운 핸들링과 안정적인 주행감
- **하이퍼 GT 스포츠카**: 폭발적인 가속력과 날카로운 핸드브레이크 드리프트
- **광명 마을버스 1-1번**: "하안사거리 ↔ 철산역" 노선의 묵직한 대형 차체
- **배민 라이더 배달 스쿠터**: 배달통 탑재! 좁은 골목과 차량 틈새를 뚫고 달리는 날렵한 기동성
- **경기남부경찰 순찰차**: 비상 경광등 스트로브 플래시 및 사이렌 탑재

### 2. 🚨 1~5성 경찰 수배 & 추격전 (Wanted System)
- 보행자 충돌, 차량 파손, 순찰차 추돌 시 지명수배 레벨(별 1~5개) 발동!
- 경찰 순찰차가 사이렌을 울리며 플레이어를 추격, 포위 및 충돌 진압 시도.
- 끈질긴 추격을 따돌리고 일정 시간 동안 시야에서 벗어나면 수배 해제, 또는 맵 곳곳의 **수배 해제 스타 아이템**을 획득하여 즉시 별 감소!

### 3. 🛵 오픈월드 미션 & 미니게임
- **[배달 특급 미션 (Baemin Rush)]**: 메가커피, 파리바게뜨에서 픽업 후 제한 시간 내 하안주공 아파트 단지로 총알 배달 (+₩85,000~₩95,000 보상)
- **[하안 총알택시 (Crazy Taxi)]**: 하안사거리 버스정류장의 승객을 태워 목적지까지 신속 수송
- **[지명수배 도주전 (Wanted Fugitive)]**: 3성 수배 상태에서 45초간 경찰 포위망을 뚫고 생존 (+₩150,000 보상)
- **[스턴트 점프 & 골드 코인]**: 하안사거리 구석구석에 숨겨진 점프대와 골드 코인 파밍

### 4. 📻 3채널 절차적 Web Audio 신스 라디오
외부 음원 파일 깨짐이나 로딩 지연 없는 **100% Web Audio API 실시간 음원 합성**:
- **Ch 1. HAAN K-WAVE FM (98.1)**: 신나는 신스 K-Pop 비트
- **Ch 2. GWANGMYEONG LO-FI CHILL**: 감성적인 하안동 드라이브 칠 비트
- **Ch 3. EUROBEAT TURBO RACING**: 질주감 넘치는 신스웨이브 레이싱 사운드
- 실시간 RPM 가변 엔진음, 타이어 스키드음, 자동차 경적(Horn), 경찰 사이렌, 충돌 타격음 완비

### 5. ☀️ 날씨 & 시간대 전환 시스템
- **낮 (14:30)**: 청명한 하늘과 밝은 도심 풍경
- **노을 (18:45)**: 황금빛 석양과 감성적인 그림자
- **네온 나이트 (22:15)**: 네온 간판과 전조등이 빛나는 사이버 하안사거리
- **하안 비 (19:20)**: 비가 내리는 빗길 드라이빙 연출

### 6. 📱 모바일 & 태블릿 완벽 대응
- 반응형 레이아웃 및 터치 스크린 전용 가상 조작 버튼(가속, 감속, 클랙슨, 펀치, 탑승) 탑재

---

## 🎮 조작 가이드 (Controls)

| 모드 | 동작 | 키보드 / 마우스 | 모바일 터치 |
|---|---|---|---|
| **도보 (On Foot)** | 이동 | `W`, `A`, `S`, `D` / 방향키 | 가상 패드 |
| | 전력 질주 | `Shift` (누른 채 이동) | - |
| | 점프 | `Space` | 점프 버튼 `⬆️` |
| | 펀치 공격 | `마우스 좌클릭` 또는 `E` | 펀치 버튼 `👊` |
| | 차량 탑승 / 강탈 | `F` 또는 `Enter` | 차량 버튼 `🚗` |
| | 카메라 시점 회전 | `마우스 드래그` | 화면 스와이프 |
| **차량 (Driving)** | 가속 / 후진 | `W` / `S` | 가속 `⚡` / 브레이크 `🛑` |
| | 핸들 조향 | `A` / `D` | 조향 |
| | 핸드브레이크 (드리프트) | `Space` | 드리프트 |
| | 클랙슨 경적 | `H` | 경적 버튼 `📢` |
| | 차량 하차 | `F` 또는 `Enter` | 차량 버튼 `🚗` |
| **시스템** | 카메라 시점 변경 | `C` (3인칭 근접 / 원거리 / 탑다운 / 1인칭 후드) | - |
| | 시간대/날씨 전환 | `T` (낮 / 노을 / 네온 나이트 / 비) | - |
| | 라디오 채널 변경 | `R` (3채널 순환) | - |
| | 미션 수락 / 취소 | `M` | - |
| | 조작 가이드 팝업 | `H` 또는 화면 상단 버튼 클릭 | 📖 버튼 |

---

## 🛠️ 기술 스택 (Tech Stack)

- **Rendering Engine**: [Three.js](https://threejs.org/) (r174) with PBR Materials, Soft Shadows & ACES Filmic Tone Mapping
- **Programming Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode, ESNext)
- **Audio Synthesis**: Web Audio API (Multi-oscillator engine synthesis, LFO modulated sirens, 3-station procedural sequencer)
- **UI & HUD**: Modern CSS3 Backdrop-filter Glassmorphism, 2D HTML5 Canvas Radar Minimap
- **Build Tool**: [Vite](https://vitejs.dev/) 6.2 (Sub-second HMR, tree-shaking, optimized bundling)
- **Deployment**: GitHub Pages (`gh-pages`)

---

## 💻 로컬 개발 환경 설정 (Local Development)

```bash
# 1. 저장소 클론
git clone https://github.com/jeiel85/haan-3d-gta.git
cd haan-3d-gta

# 2. 종속성 설치
npm install

# 3. 개발 서버 실행
npm run dev

# 4. 프로덕션 빌드
npm run build

# 5. 빌드 미리보기
npm run preview
```

---

## 📄 라이선스 (License)

This project is licensed under the MIT License.
Enjoy cruising around Gwangmyeong Haan Sageori! 🚗💨
