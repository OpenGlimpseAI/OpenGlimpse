from fastapi import FastAPI, UploadFile, File, HTTPException
from deepface import DeepFace
import cv2
import numpy as np

app = FastAPI()

print("Loading Facenet model...")
DeepFace.build_model("Facenet")
print("Facenet model loaded successfully!")


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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
