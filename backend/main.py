import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models, transforms
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io

app = FastAPI()

# 1. CORS 설정 (리액트 연동)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. MesoNet2 설계도 (도연님의 test.py 코드 기반)
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
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(64, num_classes)
        )

    def forward(self, x):
        x = F.relu(self.bn1(self.conv1(x))); x = self.maxpool(x)
        x = F.relu(self.bn2(self.conv2(x))); x = self.maxpool(x)
        x = F.relu(self.bn3(self.conv3(x))); x = self.maxpool(x)
        x = F.relu(self.bn4(self.conv4(x))); x = self.maxpool(x)
        x = self.adaptive_pool(x)
        x = x.view(x.size(0), -1)
        return self.fc(x)

# 3. 환경 및 모델 로드 (에러 방지를 위해 CPU 명시)
device = torch.device("cpu") # 로컬 DLL 에러 방지를 위해 CPU 강제 지정
print(f"Using device: {device}")

# EfficientNet-B0 로드 및 가중치 입히기
print("Loading EfficientNet-B0...")
eff_model = models.efficientnet_b0(weights=None)
num_ftrs = eff_model.classifier[1].in_features
eff_model.classifier[1] = nn.Linear(num_ftrs, 2)
eff_model.load_state_dict(torch.load("models/EfficientNet.pth", map_location=device))
eff_model.eval()

# MesoNet2 로드 및 가중치 입히기
print("Loading MesoNet2...")
meso_model = MesoNet2().to(device)
meso_model.load_state_dict(torch.load("models/MesoNet.pth", map_location=device))
meso_model.eval()

# 4. 모델별 전처리 (test.py 기준 그대로 적용)
eff_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

meso_transform = transforms.Compose([
    transforms.Resize((256, 256)),
    transforms.ToTensor(),
    transforms.Normalize([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])
])

@app.get("/")
def home():
    return {"message": "DeepEye Backend with Models is Online!"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # 이미지 읽기
    image_data = await file.read()
    image = Image.open(io.BytesIO(image_data)).convert("RGB")

    with torch.no_grad():
        # EfficientNet 예측
        eff_input = eff_transform(image).unsqueeze(0).to(device)
        eff_out = eff_model(eff_input)
        eff_prob = F.softmax(eff_out, dim=1)[0][1].item() # FAKE 확률

        # MesoNet 예측
        meso_input = meso_transform(image).unsqueeze(0).to(device)
        meso_out = meso_model(meso_input)
        meso_prob = F.softmax(meso_out, dim=1)[0][1].item() # FAKE 확률

    # 5. 7:3 앙상블 계산 (도연님의 핵심 전략)
    final_score = (eff_prob * 0.7) + (meso_prob * 0.3)
    result = "FAKE" if final_score > 0.5 else "REAL"

    return {
        "eff_score": round(eff_prob, 4),
        "meso_score": round(meso_prob, 4),
        "final_score": round(final_score, 4),
        "result": result
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)