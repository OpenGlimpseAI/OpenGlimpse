from fastapi import FastAPI, UploadFile, File, HTTPException
from deepface import DeepFace
import cv2
import numpy as np
import base64
import traceback

app = FastAPI()

print("Loading Facenet model...", flush=True)
DeepFace.build_model("Facenet")
print("Facenet model loaded successfully!", flush=True)


def _get_bbox(region):
    x = int(region.get("x", 0))
    y = int(region.get("y", 0))
    w = int(region.get("w", region.get("width", 0)))
    h = int(region.get("h", region.get("height", 0)))
    return x, y, w, h


def _encode_jpeg(img):
    success, buf = cv2.imencode('.jpg', img)
    if not success:
        raise RuntimeError("Failed to encode image as JPEG")
    return buf


@app.post("/embed")
async def get_embedding(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"success": False, "error": "Failed to decode image"}

        result = DeepFace.represent(
            img_path=img,
            model_name="Facenet",
            enforce_detection=False
        )

        if len(result) > 0:
            embedding = result[0]["embedding"]
            if isinstance(embedding, np.ndarray):
                embedding = embedding.tolist()
            return {"success": True, "embedding": embedding}
        else:
            return {"success": False, "error": "No face detected"}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect")
async def detect_faces(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"success": False, "error": "Failed to decode image"}

        faces = DeepFace.extract_faces(img_path=img, enforce_detection=False)

        bboxes = []
        for face in faces:
            x, y, w, h = _get_bbox(face["facial_area"])
            bboxes.append({"x": x, "y": y, "w": w, "h": h})

        return {"success": True, "faces": bboxes}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed-all")
async def embed_all_faces(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {"success": False, "error": "Failed to decode image"}

        faces = DeepFace.extract_faces(img_path=img, enforce_detection=False)

        results = []
        for face in faces:
            region = face["facial_area"]
            x, y, w, h = _get_bbox(region)

            cropped = img[y:y+h, x:x+w]
            if cropped.size == 0:
                continue

            repr_result = DeepFace.represent(
                img_path=cropped,
                model_name="Facenet",
                enforce_detection=False
            )

            if len(repr_result) > 0:
                buf = _encode_jpeg(cropped)
                face_b64 = base64.b64encode(buf).decode('utf-8')

                embedding = repr_result[0]["embedding"]
                if isinstance(embedding, np.ndarray):
                    embedding = embedding.tolist()

                results.append({
                    "faceImage": face_b64,
                    "embedding": embedding,
                    "bbox": {"x": x, "y": y, "w": w, "h": h},
                })

        return {"success": True, "faces": results}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
