from __future__ import annotations

import base64
import binascii
import os
from functools import lru_cache
from typing import Dict, List, Literal

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from insightface.app import FaceAnalysis
from pydantic import BaseModel, Field

app = FastAPI(title="DoSJE AI Service")


class FaceMatchRequest(BaseModel):
    registered_image: str = Field(..., description="Base64-encoded registered face image")
    captured_image: str = Field(..., description="Base64-encoded captured face image")
    threshold: float = Field(default=0.6, ge=0.0, le=1.0)


class FaceMatchResponse(BaseModel):
    match_confidence: float
    is_match: bool
    threshold: float
    model: Literal["insightface-buffalo_l"] = "insightface-buffalo_l"


class ActivityLog(BaseModel):
    cctv_uptime_pct: float = Field(ge=0.0, le=100.0)
    attendance_variance_pct: float = Field(ge=0.0, le=100.0)
    false_attendance_rate_pct: float = Field(ge=0.0, le=100.0)
    days_since_last_inspection: int = Field(ge=0)
    anomaly_count: int = Field(ge=0)
    inspection_compliance_rate_pct: float = Field(ge=0.0, le=100.0)


class AnomalyScoreRequest(BaseModel):
    institute_id: str
    logs: ActivityLog


class AnomalyReason(BaseModel):
    code: str
    message: str
    severity: Literal["low", "medium", "high"]


class AnomalyScoreResponse(BaseModel):
    institute_id: str
    anomaly_score: float
    risk_level: Literal["low", "medium", "high"]
    reasons: List[AnomalyReason]


@lru_cache(maxsize=1)
def get_face_analyzer() -> FaceAnalysis:
    model_root = os.getenv("INSIGHTFACE_HOME", "/models")
    analyzer = FaceAnalysis(
        name=os.getenv("INSIGHTFACE_MODEL", "buffalo_l"),
        root=model_root,
        providers=["CPUExecutionProvider"],
    )
    analyzer.prepare(ctx_id=-1, det_size=(640, 640))
    return analyzer


def decode_image(image_payload: str) -> np.ndarray:
    try:
        encoded = image_payload.split(",", 1)[-1]
        image_bytes = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as error:
        raise HTTPException(status_code=400, detail="Image payload is not valid base64.") from error

    image_array = np.frombuffer(image_bytes, dtype=np.uint8)
    image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="Image payload could not be decoded.")
    return image


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/attendance/face-match", response_model=FaceMatchResponse)
def face_match(payload: FaceMatchRequest) -> FaceMatchResponse:
    registered_image = decode_image(payload.registered_image)
    captured_image = decode_image(payload.captured_image)

    try:
        analyzer = get_face_analyzer()
        registered_faces = analyzer.get(registered_image)
        captured_faces = analyzer.get(captured_image)
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail=f"Face recognition model is unavailable: {error}",
        ) from error

    if len(registered_faces) != 1 or len(captured_faces) != 1:
        raise HTTPException(status_code=422, detail="Exactly one detectable face is required in both images.")

    registered_embedding = registered_faces[0].normed_embedding
    captured_embedding = captured_faces[0].normed_embedding
    similarity = float(np.clip(np.dot(registered_embedding, captured_embedding), 0.0, 1.0))
    return FaceMatchResponse(
        match_confidence=round(similarity, 4),
        is_match=similarity >= payload.threshold,
        threshold=payload.threshold,
    )


@app.post("/anomaly/score", response_model=AnomalyScoreResponse)
def anomaly_score(payload: AnomalyScoreRequest) -> AnomalyScoreResponse:
    log = payload.logs
    score = 0.0
    reasons: List[AnomalyReason] = []

    if log.cctv_uptime_pct < 85:
        score += 0.25
        reasons.append(AnomalyReason(code="CCTV_LOW_UPTIME", message="CCTV uptime is below the expected threshold.", severity="medium"))
    if log.attendance_variance_pct > 30:
        score += 0.2
        reasons.append(AnomalyReason(code="ATTENDANCE_VARIANCE", message="Attendance counts vary sharply from expected patterns.", severity="medium"))
    if log.false_attendance_rate_pct > 15:
        score += 0.25
        reasons.append(AnomalyReason(code="FALSE_ATTENDANCE", message="False-attendance rate exceeds acceptable limits.", severity="high"))
    if log.days_since_last_inspection > 30:
        score += 0.15
        reasons.append(AnomalyReason(code="LOW_VISIT_FREQUENCY", message="The institute has not been inspected recently.", severity="low"))
    if log.anomaly_count > 2:
        score += 0.2
        reasons.append(AnomalyReason(code="MULTIPLE_ANOMALIES", message="Multiple anomalies have been recorded recently.", severity="high"))
    if log.inspection_compliance_rate_pct < 60:
        score += 0.15
        reasons.append(AnomalyReason(code="LOW_COMPLIANCE", message="Inspection compliance rate is below expected performance.", severity="medium"))

    score = round(min(score, 1.0), 4)
    risk = "high" if score >= 0.75 else "medium" if score >= 0.4 else "low"
    return AnomalyScoreResponse(
        institute_id=payload.institute_id,
        anomaly_score=score,
        risk_level=risk,
        reasons=reasons,
    )
