# 웹툰만화툴 · Scroll Studio

웹툰과 출판만화의 러프, 컷, 말풍선, 3D 구도를 한곳에서 만드는 브라우저 편집 도구입니다.

[도구 열기](https://bskimu.github.io/scroll-studio/) · [업데이트 기록](https://github.com/BSKIMU/scroll-studio/commits/main/) · [배포 상태](https://github.com/BSKIMU/scroll-studio/actions)

## 주요 기능

- **컷·말풍선 인식:** 페이지 러프에서 후보를 찾고, 위치와 크기를 다듬어 편집 가능한 컷·말풍선으로 적용합니다.
- **그리기:** 펜·수채 붓·에어브러시, 올가미 선택, 이동·회전·크기 변형, 이미지 붙여넣기와 레이어 편집을 지원합니다.
- **3D 장면:** 배경·인물을 배치하고 카메라를 조절합니다. 캐릭터 걷기·뛰기·점프, 추가한 계단 오르기, 문 여닫기와 통과 동작을 원하는 자세로 고정합니다.
- **페이지와 출력:** 웹툰·출판만화 페이지, 말풍선·대사, PNG·레이어 PSD 출력, 스크롤·3D 제본 미리보기를 제공합니다.

앱의 **도움말**에서 기능별 조작 방법을 확인할 수 있습니다.

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

개인 원고, 로컬 백업, 임시 출력물과 개발 메모는 `.gitignore`로 제외합니다. 공개 파일은 `dist/`, 배포 설정은 `.github/workflows/deploy.yml`입니다. 로컬 `README.md`는 개인 개발 기록이며 저장소에는 이 안내서를 표시합니다.

## 포함된 소재

배포에 포함된 외부 라이브러리·폰트·소재의 개별 라이선스와 출처 표시를 유지합니다. 교실 소재 정보는 [출처 파일](../dist/assets/korean-classroom-ATTRIBUTION.txt)에 있습니다.
