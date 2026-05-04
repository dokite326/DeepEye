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

app = FastAPI()

# 1. CORS 및 Static 설정
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
STATIC_DIR = "static"
if not os.path.exists(STATIC_DIR): os.makedirs(STATIC_DIR)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ✅ [추가] 오래된 파일 삭제 로직 (기본 1시간 지난 파일 삭제)
def cleanup_old_files(directory: str, max_age_seconds: int = 3600):
    try:
        now = time.time()
        for filename in os.listdir(directory):
            # lime_ 으로 시작하는 결과 이미지 파일만 타겟팅 (중요 샘플 제외)
            if filename.startswith("lime_"):
                file_path = os.path.join(directory, filename)
                if os.path.getmtime(file_path) < now - max_age_seconds:
                    os.remove(file_path)
                    print(f"🗑️ Deleted old result: {filename}")
    except Exception as e:
        print(f"⚠️ Cleanup Error: {e}")

# 2. MesoNet2 및 모델 로직
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
        self.fc = nn.Sequential(nn.Linear(128, 64), nn.ReLU(), nn.Dropout(0.5), nn.Linear(64, num_classes))
    def forward(self, x):
        x = F.relu(self.bn1(self.conv1(x))); x = self.maxpool(x)
        x = F.relu(self.bn2(self.conv2(x))); x = self.maxpool(x)
        x = F.relu(self.bn3(self.conv3(x))); x = self.maxpool(x)
        x = F.relu(self.bn4(self.conv4(x))); x = self.maxpool(x)
        x = self.adaptive_pool(x)
        return self.fc(x.view(x.size(0), -1))

device = torch.device("cpu")
eff_transform = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor(), transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
meso_transform = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor(), transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])])

try:
    eff_model = models.efficientnet_b0(weights=None)
    eff_model.classifier[1] = nn.Linear(eff_model.classifier[1].in_features, 2)
    eff_model.load_state_dict(torch.load("models/EfficientNet.pth", map_location=device))
    eff_model.eval()
    meso_model = MesoNet2().to(device)
    meso_model.load_state_dict(torch.load("models/MesoNet.pth", map_location=device))
    meso_model.eval()
    print("✅ Models loaded successfully!")
except Exception as e:
    print(f"❌ Model Load Error: {e}")

explainer = lime_image.LimeImageExplainer()

def batch_predict_eff(imgs):
    imgs_torch = torch.stack([eff_transform(Image.fromarray((i*255).astype(np.uint8))) for i in imgs]).to(device)
    return F.softmax(eff_model(imgs_torch), dim=1).detach().cpu().numpy()

def batch_predict_meso(imgs):
    imgs_torch = torch.stack([meso_transform(Image.fromarray((i*255).astype(np.uint8))) for i in imgs]).to(device)
    return F.softmax(meso_model(imgs_torch), dim=1).detach().cpu().numpy()

# 3. 공통 분석 함수
def analyze_image(image: Image.Image, unique_id: str):
    image_rgb = image.convert("RGB").resize((224, 224))
    img_array = np.array(image_rgb) / 255.0

    with torch.no_grad():
        eff_in = eff_transform(image_rgb).unsqueeze(0).to(device)
        eff_prob = F.softmax(eff_model(eff_in), dim=1)[0][1].item()
        meso_in = meso_transform(image_rgb).unsqueeze(0).to(device)
        meso_prob = F.softmax(meso_model(meso_in), dim=1)[0][1].item()

    exp_eff = explainer.explain_instance(img_array, batch_predict_eff, top_labels=1, hide_color=0, num_samples=250)
    exp_meso = explainer.explain_instance(img_array, batch_predict_meso, top_labels=1, hide_color=0, num_samples=250)

    _, mask_eff = exp_eff.get_image_and_mask(exp_eff.top_labels[0], positive_only=True, num_features=2, hide_rest=False, min_weight=0.05)
    _, mask_meso = exp_meso.get_image_and_mask(exp_meso.top_labels[0], positive_only=True, num_features=2, hide_rest=False, min_weight=0.05)

    overlay = np.zeros((224, 224, 3), dtype=np.uint8)
    for y in range(224):
        for x in range(224):
            if mask_eff[y, x] and mask_meso[y, x]: overlay[y, x] = [255, 0, 0]
            elif mask_eff[y, x]: overlay[y, x] = [255, 255, 0]
            elif mask_meso[y, x]: overlay[y, x] = [255, 165, 0]

    combined = cv2.addWeighted(np.array(image_rgb), 0.5, overlay, 0.5, 0)
    final_score = (eff_prob * 0.8) + (meso_prob * 0.2)
    result = "FAKE" if final_score > 0.5 else "REAL"
    
    lime_image_name = f"lime_{unique_id}.png"
    Image.fromarray(combined).save(os.path.join(STATIC_DIR, lime_image_name))
    
    return {
        "eff_score": round(eff_prob, 4), "meso_score": round(meso_prob, 4),
        "final_score": round(final_score, 4), "result": result,
        "lime_url": f"http://127.0.0.1:8000/static/{lime_image_name}"
    }

# 4. API 엔드포인트
@app.post("/predict")
async def predict(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # API 요청 시마다 백그라운드에서 오래된 파일 정리
    background_tasks.add_task(cleanup_old_files, STATIC_DIR)
    try:
        contents = await file.read()
        is_video = file.content_type.startswith("video/") or file.filename.endswith(('.mp4', '.avi', '.mov'))
        if is_video:
            temp_name = f"temp_{uuid.uuid4()}.mp4"
            with open(temp_name, "wb") as f: f.write(contents)
            cap = cv2.VideoCapture(temp_name)
            success, frame = cap.read()
            cap.release()
            if os.path.exists(temp_name): os.remove(temp_name)
            if not success: raise Exception("Frame extraction failed")
            image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        else:
            image = Image.open(io.BytesIO(contents))
        return analyze_image(image, str(uuid.uuid4()))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ✅ 5. 수정된 predict_link (yt-dlp 활용 실제 분석)
@app.post("/predict-link")
async def predict_link(background_tasks: BackgroundTasks, payload: dict = Body(...)):
    background_tasks.add_task(cleanup_old_files, STATIC_DIR)
    try:
        url = payload.get("url")
        start_time = payload.get("startTime", 0) 
        
        if not url:
            raise Exception("URL이 제공되지 않았습니다.")

        ydl_opts = {'format': 'best', 'quiet': True, 'noplaylist': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            video_url = info['url']

        cap = cv2.VideoCapture(video_url)
        cap.set(cv2.CAP_PROP_POS_MSEC, start_time * 1000) 
        success, frame = cap.read()
        cap.release()

        if not success:
            cap = cv2.VideoCapture(video_url)
            success, frame = cap.read()
            cap.release()
            if not success: raise Exception("영상을 읽을 수 없습니다.")

        image = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        return analyze_image(image, str(uuid.uuid4()))

    except Exception as e:
        print(f"❌ Link Analysis Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    # 서버 실행 시 초기 1회 청소
    cleanup_old_files(STATIC_DIR)
    uvicorn.run(app, host="127.0.0.1", port=8000)