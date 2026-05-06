import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from fastapi import FastAPI, File, UploadFile, Body, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image
import io
import os
import uuid
import cv2
import numpy as np
from lime import lime_image
import yt_dlp
import time
from dotenv import load_dotenv
from google import genai

# .env 파일 로드
load_dotenv()

app = FastAPI()

# ---------------------------------------------------------
# 0. Gemini 설정 (정식 v1 버전 및 최신 모델 고정)
# ---------------------------------------------------------
GENAI_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GENAI_KEY, http_options={"api_version": "v1"})

# 도연님의 프로젝트 권한 목록에서 확인된 최상위 모델
MODEL_NAME = "gemini-2.5-flash"

# 1. CORS 및 Static 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = "static"
if not os.path.exists(STATIC_DIR):
    os.makedirs(STATIC_DIR)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# ✅ 오래된 파일 삭제 로직
def cleanup_old_files(directory: str, max_age_seconds: int = 3600):
    try:
        now = time.time()
        for filename in os.listdir(directory):
            if filename.startswith("lime_"):
                file_path = os.path.join(directory, filename)
                if os.path.getmtime(file_path) < now - max_age_seconds:
                    os.remove(file_path)
    except Exception as e:
        print(f"⚠️ Cleanup Error: {e}")


# 2. MesoNet2 모델 정의 (딥페이크 탐지용)
class MesoNet2(nn.Module):
    def __init__(self, num_classes=2):
        super(MesoNet2, self).__init__()
        self.conv1 = nn.Conv2d(3, 16, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(16)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=5, padding=2)
        self.bn2 = nn.BatchNorm2d(32)
        self.conv3 = nn.Conv2d(32, 64, kernel_size=5, padding=2)
        self.bn3 = nn.BatchNorm2d(64)
        self.conv4 = nn.Conv2d(64, 128, kernel_size=5, padding=2)
        self.bn4 = nn.BatchNorm2d(128)
        self.maxpool = nn.MaxPool2d(kernel_size=2, stride=2)
        self.adaptive_pool = nn.AdaptiveAvgPool2d((1, 1))
        self.fc = nn.Sequential(
            nn.Linear(128, 64), nn.ReLU(), nn.Dropout(0.5), nn.Linear(64, num_classes)
        )

    def forward(self, x):
        x = F.relu(self.bn1(self.conv1(x)))
        x = self.maxpool(x)
        x = F.relu(self.bn2(self.conv2(x)))
        x = self.maxpool(x)
        x = F.relu(self.bn3(self.conv3(x)))
        x = self.maxpool(x)
        x = F.relu(self.bn4(self.conv4(x)))
        x = self.maxpool(x)
        x = self.adaptive_pool(x)
        return self.fc(x.view(x.size(0), -1))


device = torch.device("cpu")
eff_transform = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ]
)
meso_transform = transforms.Compose(
    [
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
    ]
)

try:
    eff_model = models.efficientnet_b0(weights=None)
    eff_model.classifier[1] = nn.Linear(eff_model.classifier[1].in_features, 2)
    eff_model.load_state_dict(
        torch.load("models/EfficientNet.pth", map_location=device)
    )
    eff_model.eval()
    meso_model = MesoNet2().to(device)
    meso_model.load_state_dict(torch.load("models/MesoNet.pth", map_location=device))
    meso_model.eval()
    print("✅ Models loaded successfully!")
except Exception as e:
    print(f"❌ Model Load Error: {e}")

explainer = lime_image.LimeImageExplainer()


def batch_predict_eff(imgs):
    imgs_torch = torch.stack(
        [eff_transform(Image.fromarray((i * 255).astype(np.uint8))) for i in imgs]
    ).to(device)
    return F.softmax(eff_model(imgs_torch), dim=1).detach().cpu().numpy()


def batch_predict_meso(imgs):
    imgs_torch = torch.stack(
        [meso_transform(Image.fromarray((i * 255).astype(np.uint8))) for i in imgs]
    ).to(device)
    return F.softmax(meso_model(imgs_torch), dim=1).detach().cpu().numpy()


# ---------------------------------------------------------
# ✅ 1. 인간 친화적 리포트 생성기 (Human-like Reasoning)
# ---------------------------------------------------------
async def get_llm_report(data: dict):
    prompt = f"""
    너는 인공지능 기반 딥페이크 탐지 시스템 'DeepEye'의 전문 분석관이야. 
    사용자에게 다음 분석 결과를 설명해주되, 전문 용어보다는 '사람이 눈으로 봤을 때의 특징'으로 풀어서 3~4문장으로 작성해줘.

    [분석 데이터]
    - 판정: {data['result']} (신뢰도: {data['final_score'] * 100:.2f}%)
    - 모델별 확률: 메인({data['eff_score']:.4f}), 보조({data['meso_score']:.4f})
    - 불일치 여부: {data['is_discrepancy']}

    [작성 가이드]
    1. '픽셀 값 변화' 대신 '피부 질감의 부자연스러움'이나 '턱선/눈가 경계의 흔들림' 같은 표현을 써줘.
    2. REAL 판정이라면 '실제 인간의 미세한 근육 움직임이 자연스럽게 포착됨' 등을 언급해줘.
    3. LIME 시각화의 색상(노랑, 주황, 빨강)이 탐지의 핵심 근거임을 강조해줘.
    4. 답변 시 마크다운(bold 기호 ** 등)을 절대 사용하지 말고 순수 텍스트만 출력해줘.
    """
    try:
        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        return response.text.strip()
    except Exception as e:
        print(f"❌ Report Error: {e}")
        return "분석 리포트를 생성하는 중 일시적인 오류가 발생했습니다."


# ---------------------------------------------------------
# ✅ 2. 멀티모달 챗봇 (이미지 직접 분석)
# ---------------------------------------------------------
@app.post("/chat")
async def chat_with_deepeye(payload: dict = Body(...)):
    user_msg = payload.get("message")
    context = payload.get("context", "분석 정보 없음")
    lime_url = payload.get("lime_url", "")

    try:
        content_list = [f"""
        너는 DeepEye의 시각 지능 대화 AI야.
        함께 제공된 [이미지]는 LIME 기법으로 모델이 '어디를 보고 판단했는지' 색칠한 결과물이야.
        노란색/주황색/빨간색으로 칠해진 부분이 실제 사람의 '어느 부위'인지(예: 왼쪽 눈, 턱선, 배경 창문 틀 등) 
        이미지를 직접 보고 분석해서 질문에 답해줘. 답변 시 마크다운(bold 기호 ** 등)을 절대 사용하지 말고 순수 텍스트만 출력해줘.
        
        문맥 정보: {context}
        사용자 질문: {user_msg}
        """]

        if lime_url:
            image_name = lime_url.split("/")[-1]
            image_path = os.path.join(STATIC_DIR, image_name)
            if os.path.exists(image_path):
                img = Image.open(image_path)
                content_list.append(img)

        response = client.models.generate_content(
            model=MODEL_NAME, contents=content_list
        )
        return {"reply": response.text.strip()}
    except Exception as e:
        print(f"❌ Chat Error: {e}")
        return {"reply": "서버 통신이 원활하지 않습니다. 잠시 후 다시 질문해 주세요."}


# ---------------------------------------------------------
# ✅ 3. 분석 공통 함수 및 엔드포인트
# ---------------------------------------------------------
async def analyze_image(image: Image.Image, unique_id: str):
    image_rgb = image.convert("RGB").resize((224, 224))
    img_array = np.array(image_rgb) / 255.0

    with torch.no_grad():
        eff_in = eff_transform(image_rgb).unsqueeze(0).to(device)
        eff_prob = F.softmax(eff_model(eff_in), dim=1)[0][1].item()
        meso_in = meso_transform(image_rgb).unsqueeze(0).to(device)
        meso_prob = F.softmax(meso_model(meso_in), dim=1)[0][1].item()

    CUSTOM_THRESHOLD = 0.4
    eff_result = "FAKE" if eff_prob > CUSTOM_THRESHOLD else "REAL"
    meso_result = "FAKE" if meso_prob > CUSTOM_THRESHOLD else "REAL"

    exp_eff = explainer.explain_instance(
        img_array, batch_predict_eff, top_labels=1, hide_color=0, num_samples=250
    )
    _, mask_eff = exp_eff.get_image_and_mask(
        exp_eff.top_labels[0],
        positive_only=True,
        num_features=2,
        hide_rest=False,
        min_weight=0.05,
    )

    overlay = np.zeros((224, 224, 3), dtype=np.uint8)

    if eff_result == meso_result:
        exp_meso = explainer.explain_instance(
            img_array, batch_predict_meso, top_labels=1, hide_color=0, num_samples=250
        )
        _, mask_meso = exp_meso.get_image_and_mask(
            exp_meso.top_labels[0],
            positive_only=True,
            num_features=2,
            hide_rest=False,
            min_weight=0.05,
        )
        for y in range(224):
            for x in range(224):
                if mask_eff[y, x] and mask_meso[y, x]:
                    overlay[y, x] = [255, 0, 0]
                elif mask_eff[y, x]:
                    overlay[y, x] = [255, 255, 0]
                elif mask_meso[y, x]:
                    overlay[y, x] = [255, 165, 0]
    else:
        for y in range(224):
            for x in range(224):
                if mask_eff[y, x]:
                    overlay[y, x] = [255, 255, 0]

    combined = cv2.addWeighted(np.array(image_rgb), 0.5, overlay, 0.5, 0)
    adjusted_score = min(eff_prob, 0.9992) if eff_prob > 0.5 else max(eff_prob, 0.0008)

    lime_image_name = f"lime_{unique_id}.png"
    Image.fromarray(combined).save(os.path.join(STATIC_DIR, lime_image_name))

    analysis_result = {
        "eff_score": round(eff_prob, 4),
        "meso_score": round(meso_prob, 4),
        "final_score": round(adjusted_score, 4),
        "result": eff_result,
        "lime_url": f"http://127.0.0.1:8000/static/{lime_image_name}",
        "is_discrepancy": eff_result != meso_result,
    }

    analysis_result["llm_report"] = await get_llm_report(analysis_result)
    return analysis_result


@app.post("/predict")
async def predict(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    background_tasks.add_task(cleanup_old_files, STATIC_DIR)
    try:
        contents = await file.read()
        if file.content_type.startswith("video/") or file.filename.endswith(
            (".mp4", ".avi", ".mov")
        ):
            temp_name = f"temp_{uuid.uuid4()}.mp4"
            with open(temp_name, "wb") as f:
                f.write(contents)
            cap = cv2.VideoCapture(temp_name)
            success, frame = cap.read()
            cap.release()
            if os.path.exists(temp_name):
                os.remove(temp_name)
            image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        else:
            image = Image.open(io.BytesIO(contents))
        return await analyze_image(image, str(uuid.uuid4()))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ✅ [수정된 부분] 404 에러 방지를 위해 하이픈(-) 경로로 설정
@app.post("/predict-link")
async def predict_link(background_tasks: BackgroundTasks, payload: dict = Body(...)):
    background_tasks.add_task(cleanup_old_files, STATIC_DIR)
    try:
        url = payload.get("url")
        start_time = payload.get("startTime", 0)

        ydl_opts = {"format": "best", "quiet": True, "noplaylist": True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_url = info["url"]

        cap = cv2.VideoCapture(video_url)
        cap.set(cv2.CAP_PROP_POS_MSEC, start_time * 1000)
        success, frame = cap.read()
        cap.release()

        if not success:
            raise HTTPException(
                status_code=400, detail="영상 프레임을 가져올 수 없습니다."
            )

        image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        return await analyze_image(image, str(uuid.uuid4()))

    except Exception as e:
        print(f"❌ Link Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
