from fastapi import FastAPI, UploadFile, File, HTTPException
from deepface import DeepFace
import cv2
import numpy as np
import base64

app = FastAPI()

print("Loading Facenet model...", flush=True)
DeepFace.build_model("Facenet")
print("Facenet model loaded successfully!", flush=True)


@app.post("/embed")
async def get_embedding(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        result = DeepFace.represent(
            img_path=img,
            model_name="Facenet",
            enforce_detection=False
        )

        if len(result) > 0:
            return {"success": True, "embedding": result[0]["embedding"]}
        else:
            return {"success": False, "error": "No face detected"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect")
async def detect_faces(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        faces = DeepFace.extract_faces(img_path=img, enforce_detection=True)

        bboxes = []
        for face in faces:
            region = face["facial_area"]
            bboxes.append({
                "x": int(region["x"]),
                "y": int(region["y"]),
                "w": int(region["w"]),
                "h": int(region["h"]),
            })

        return {"success": True, "faces": bboxes}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed-all")
async def embed_all_faces(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        faces = DeepFace.extract_faces(img_path=img, enforce_detection=True)

        results = []
        for face in faces:
            region = face["facial_area"]
            x, y, w, h = int(region["x"]), int(region["y"]), int(region["w"]), int(region["h"])

            cropped = img[y:y+h, x:x+w]

            repr_result = DeepFace.represent(
                img_path=cropped,
                model_name="Facenet",
                enforce_detection=False
            )

            if len(repr_result) > 0:
                _, buf = cv2.imencode('.jpg', cropped)
                face_b64 = base64.b64encode(buf.tobytes()).decode('utf-8')

                results.append({
                    "faceImage": face_b64,
                    "embedding": repr_result[0]["embedding"],
                    "bbox": {"x": x, "y": y, "w": w, "h": h},
                })

        return {"success": True, "faces": results}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
