# 웹툰만화툴 · Scroll Studio

[English](README.md) · 한국어

웹툰과 출판만화의 러프, 컷, 말풍선, 3D 구도를 한곳에서 만드는 브라우저 편집 도구입니다.

[도구 열기](https://bskimu.github.io/scroll-studio/) · [업데이트 기록](https://github.com/BSKIMU/scroll-studio/commits/main/) · [배포 상태](https://github.com/BSKIMU/scroll-studio/actions)

## 주요 기능

- **컷·말풍선 인식:** 페이지 러프에서 후보를 찾고, 위치와 크기를 다듬어 편집 가능한 컷·말풍선으로 적용합니다.
- **그리기:** 펜·수채 붓·에어브러시, 올가미 선택, 이동·회전·크기 변형, 이미지 붙여넣기와 레이어 편집을 지원합니다.
- **3D 장면:** 배경·인물을 배치하고 카메라를 조절합니다. 캐릭터 걷기·뛰기·점프, 추가한 계단 오르기, 문 여닫기와 통과 동작을 원하는 자세로 고정합니다.
- **페이지와 출력:** 웹툰·출판만화 페이지, 말풍선·대사, PNG·레이어 PSD 출력, 스크롤·3D 제본 미리보기를 제공합니다.

앱의 **도움말**에서 기능별 조작 방법을 확인할 수 있습니다.

### 3D 인물·모션·하늘

- 인물 선택창에서 **여성 BodyChan(165cm), 남성 BodyKun(180cm), Mixamo(175cm)**를 추가합니다. 검토한 남성 얼굴, 성별 기본 서기와 자동 손 모양이 포함됩니다.
- 걷기·달리기·점프 외에 앉기, 남녀 앉은 자세, 눕기, 계단, 문 통과 등 **13개 상호작용 모션**을 함께 제공합니다. 모션 파일은 사이트에 포함되어 로컬 서버가 필요하지 않습니다.
- **하늘**에서 낮·노을·황혼·밤·일출 전·새벽·오로라·Anime Sky 등을 선택합니다. HDRI의 밝기·방향·색을 분석한 자연광, 창문을 통한 그림자, 지평선 바닥과 거리별 그리드 감쇠가 포함됩니다. 하늘은 고정 이미지로 재사용하며 매 프레임 구름을 다시 계산하지 않습니다.
- **Fly / 사람 시점:** 좌클릭을 누른 채 둘러보기, WASD 이동. 사람 시점 기본 1.3m, Shift 숙이기, Space 점프. 인물 움직임의 Shift는 달리기입니다.
- **촬영 카메라:** 화각·초점거리·Sensor Fit·센서 크기. 테두리 선택 후 R, X/Y/Z 회전, Enter 확정, Esc 취소. 선택한 배경·그룹과 인물도 축 핸들로 조정합니다.

로컬과 GitHub Pages는 같은 모델·모션·환경 설정을 사용합니다. 개인 원고와 직접 추가한 소재는 자동으로 사이트 간 이동하지 않으므로 프로젝트 파일로 옮겨주세요. Blender 변환은 아래 안내처럼 로컬에서만 지원합니다.

## 원고 저장

원고는 사용하는 브라우저에 자동 저장됩니다. 다른 기기나 사이트 주소로 옮길 때는 **파일 → 프로젝트 저장**으로 내려받은 뒤 **프로젝트 열기**로 가져오세요. GitHub에 방문자의 원고가 업로드되지는 않습니다.

## 로컬 실행

Python 3이 설치된 환경에서 실행합니다.

```sh
git clone https://github.com/BSKIMU/scroll-studio.git
cd scroll-studio
python tools/server.py
```

브라우저에서 `http://127.0.0.1:8765/`를 엽니다. Windows에서는 `Start-Scroll-Studio.ps1`도 사용할 수 있습니다. 웹 의존성은 `dist/vendor/`에 포함되어 있으며 기본 실행에 npm 설치가 필요하지 않습니다.

Blender 원본 변환은 설치된 Blender를 사용하는 로컬 기능입니다. 필요하면 `BLENDER_PATH`에 실행 파일 경로를 지정하세요. 공개 웹에서는 GLB로 내보낸 모델을 가져옵니다.

## 수정하고 공개하기

1. 로컬 파일을 수정하고 `localhost`에서 확인합니다.
2. Node.js 24로 `node tools/check-release.mjs`를 실행합니다.
3. 변경을 검토하고 Commit합니다.
4. `main`에 Push하면 GitHub Actions가 검사 후 GitHub Pages에 배포합니다.
5. Actions에서 성공을 확인하고 같은 공개 주소를 새로고침합니다.

공개 사이트의 캐시 버전은 배포할 때 자동으로 갱신됩니다. 검사에 실패하면 배포하지 않습니다. 이전 상태로 돌아가려면 해당 변경을 Revert한 뒤 다시 Push하세요.

`node tools/test-live-release.mjs`는 공개 주소의 `release.json` 커밋을 확인하고, 실제 HTTPS로 받은 모든 파일의 SHA-256을 로컬 커밋과 비교합니다. 이어서 내려받은 GLB·FBX·모션 JSON으로 세 모델의 WASD·달리기·점프·착지·자세 저장/복원을 검사합니다. 브라우저 화면과 GPU 렌더는 별도로 확인합니다.

개인 원고, 로컬 백업, 임시 출력물과 개발 메모는 `.gitignore`로 제외합니다. 공개 파일은 `dist/`, 배포 설정은 `.github/workflows/deploy.yml`입니다. 로컬 `README.md`는 개인 개발 기록이며 저장소에는 이 안내서를 표시합니다.

## 포함된 소재

배포에 포함된 외부 라이브러리·폰트·소재의 개별 라이선스와 출처 표시를 유지합니다. 교실 소재 정보는 [출처 파일](../dist/assets/korean-classroom-ATTRIBUTION.txt)에 있습니다.

추가 출처: [남성 헤드](../dist/assets/bodykun-ATTRIBUTION.txt), [HDRI](../dist/assets/hdri/NOTICE.txt), [오로라·Anime Sky](../dist/assets/skies/NOTICE.txt), [구름 노이즈](../dist/assets/clouds/NOTICE.txt). 앱 코드의 라이선스가 외부 소재에 새 권리를 부여하지는 않습니다.
