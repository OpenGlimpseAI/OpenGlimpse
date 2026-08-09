import os
import base64
import threading
import traceback
import urllib.request

import cv2
import numpy as np
import onnxruntime
from fastapi import FastAPI, UploadFile, File, HTTPException

app = FastAPI()

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
DETECTOR_URL = "https://github.com/yakhyo/face-reidentification/releases/download/v0.0.1/det_2.5g.onnx"
RECOGNIZER_URL = "https://github.com/yakhyo/face-reidentification/releases/download/v0.0.1/w600k_mbf.onnx"
DETECTOR_PATH = os.path.join(MODELS_DIR, "det_2.5g.onnx")
RECOGNIZER_PATH = os.path.join(MODELS_DIR, "w600k_mbf.onnx")

REFERENCE_LANDMARKS = np.array(
    [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041],
    ],
    dtype=np.float32,
)

_model_lock = threading.Lock()
_models_loaded = False
_detector = None
_recognizer = None


def _download(url, dest):
    os.makedirs(MODELS_DIR, exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return
    print(f"Downloading {os.path.basename(dest)}...", flush=True)
    urllib.request.urlretrieve(url, dest)
    print(f"Downloaded {os.path.basename(dest)}", flush=True)


def distance2bbox(points, distance, max_shape=None):
    x1 = points[:, 0] - distance[:, 0]
    y1 = points[:, 1] - distance[:, 1]
    x2 = points[:, 0] + distance[:, 2]
    y2 = points[:, 1] + distance[:, 3]
    if max_shape is not None:
        x1 = np.clip(x1, 0, max_shape[1])
        y1 = np.clip(y1, 0, max_shape[0])
        x2 = np.clip(x2, 0, max_shape[1])
        y2 = np.clip(y2, 0, max_shape[0])
    return np.stack([x1, y1, x2, y2], axis=-1)


def distance2kps(points, distance, max_shape=None):
    preds = []
    for i in range(0, distance.shape[1], 2):
        px = points[:, i % 2] + distance[:, i]
        py = points[:, i % 2 + 1] + distance[:, i + 1]
        if max_shape is not None:
            px = np.clip(px, 0, max_shape[1])
            py = np.clip(py, 0, max_shape[0])
        preds.append(px)
        preds.append(py)
    return np.stack(preds, axis=-1)


class SCRFD:
    def __init__(self, model_path, input_size=(640, 640), conf_thres=0.5, iou_thres=0.4):
        self.input_size = input_size
        self.conf_thres = conf_thres
        self.iou_thres = iou_thres
        self.fmc = 3
        self._feat_stride_fpn = [8, 16, 32]
        self._num_anchors = 2
        self.use_kps = True
        self.mean = 127.5
        self.std = 128.0
        self.center_cache = {}
        self.session = onnxruntime.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self.output_names = [x.name for x in self.session.get_outputs()]
        self.input_names = [x.name for x in self.session.get_inputs()]
        print(f"Loaded SCRFD detector from {model_path}", flush=True)

    def forward(self, image, threshold):
        scores_list = []
        bboxes_list = []
        kpss_list = []
        input_size = tuple(image.shape[0:2][::-1])

        blob = cv2.dnn.blobFromImage(
            image,
            1.0 / self.std,
            input_size,
            (self.mean, self.mean, self.mean),
            swapRB=True,
        )
        outputs = self.session.run(self.output_names, {self.input_names[0]: blob})

        input_height = blob.shape[2]
        input_width = blob.shape[3]

        fmc = self.fmc
        for idx, stride in enumerate(self._feat_stride_fpn):
            scores = outputs[idx]
            bbox_preds = outputs[idx + fmc]
            bbox_preds = bbox_preds * stride
            if self.use_kps:
                kps_preds = outputs[idx + fmc * 2] * stride

            height = input_height // stride
            width = input_width // stride
            key = (height, width, stride)
            if key in self.center_cache:
                anchor_centers = self.center_cache[key]
            else:
                anchor_centers = np.stack(np.mgrid[:height, :width][::-1], axis=-1).astype(np.float32)
                anchor_centers = (anchor_centers * stride).reshape((-1, 2))
                if self._num_anchors > 1:
                    anchor_centers = np.stack([anchor_centers] * self._num_anchors, axis=1).reshape((-1, 2))
                if len(self.center_cache) < 100:
                    self.center_cache[key] = anchor_centers

            pos_inds = np.where(scores >= threshold)[0]
            bboxes = distance2bbox(anchor_centers, bbox_preds)
            pos_scores = scores[pos_inds]
            pos_bboxes = bboxes[pos_inds]
            scores_list.append(pos_scores)
            bboxes_list.append(pos_bboxes)
            if self.use_kps:
                kpss = distance2kps(anchor_centers, kps_preds)
                kpss = kpss.reshape((kpss.shape[0], -1, 2))
                pos_kpss = kpss[pos_inds]
                kpss_list.append(pos_kpss)
        return scores_list, bboxes_list, kpss_list

    def detect(self, image, max_num=0):
        width, height = self.input_size

        im_ratio = float(image.shape[0]) / image.shape[1]
        model_ratio = height / width
        if im_ratio > model_ratio:
            new_height = height
            new_width = int(new_height / im_ratio)
        else:
            new_width = width
            new_height = int(new_width * im_ratio)

        det_scale = float(new_height) / image.shape[0]
        resized_image = cv2.resize(image, (new_width, new_height))

        det_image = np.zeros((height, width, 3), dtype=np.uint8)
        det_image[:new_height, :new_width, :] = resized_image

        scores_list, bboxes_list, kpss_list = self.forward(det_image, self.conf_thres)

        scores = np.vstack(scores_list)
        scores_ravel = scores.ravel()
        order = scores_ravel.argsort()[::-1]
        bboxes = np.vstack(bboxes_list) / det_scale

        if self.use_kps:
            kpss = np.vstack(kpss_list) / det_scale

        pre_det = np.hstack((bboxes, scores)).astype(np.float32, copy=False)
        pre_det = pre_det[order, :]
        keep = self.nms(pre_det, iou_thres=self.iou_thres)
        det = pre_det[keep, :]
        if self.use_kps:
            kpss = kpss[order, :, :]
            kpss = kpss[keep, :, :]
        else:
            kpss = None
        if 0 < max_num < det.shape[0]:
            area = (det[:, 2] - det[:, 0]) * (det[:, 3] - det[:, 1])
            image_center = image.shape[0] // 2, image.shape[1] // 2
            offsets = np.vstack(
                [
                    (det[:, 0] + det[:, 2]) / 2 - image_center[1],
                    (det[:, 1] + det[:, 3]) / 2 - image_center[0],
                ]
            )
            offset_dist_squared = np.sum(np.power(offsets, 2.0), 0)
            bindex = np.argsort(area)[::-1]
            bindex = bindex[0:max_num]
            det = det[bindex, :]
            if kpss is not None:
                kpss = kpss[bindex, :]
        return det, kpss

    def nms(self, dets, iou_thres):
        x1 = dets[:, 0]
        y1 = dets[:, 1]
        x2 = dets[:, 2]
        y2 = dets[:, 3]
        scores = dets[:, 4]

        areas = (x2 - x1 + 1) * (y2 - y1 + 1)
        order = scores.argsort()[::-1]

        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])

            w = np.maximum(0.0, xx2 - xx1 + 1)
            h = np.maximum(0.0, yy2 - yy1 + 1)
            inter = w * h
            ovr = inter / (areas[i] + areas[order[1:]] - inter)

            indices = np.where(ovr <= iou_thres)[0]
            order = order[indices + 1]

        return keep


class ArcFace:
    def __init__(self, model_path):
        self.input_size = (112, 112)
        self.normalization_mean = 127.5
        self.normalization_scale = 127.5
        self.session = onnxruntime.InferenceSession(model_path, providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.output_names = [o.name for o in self.session.get_outputs()]
        print(f"Loaded ArcFace recognizer from {model_path}", flush=True)

    def get_embedding(self, image, landmarks, normalized=True):
        aligned, _ = face_alignment(image, landmarks)
        blob = cv2.dnn.blobFromImage(
            aligned,
            1.0 / self.normalization_scale,
            self.input_size,
            (self.normalization_mean,) * 3,
            swapRB=True,
        )
        embedding = self.session.run(self.output_names, {self.input_name: blob})[0].flatten()
        if normalized:
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
        return embedding


def _estimate_norm(landmark, image_size=112):
    if image_size % 112 == 0:
        ratio = float(image_size) / 112.0
        diff_x = 0.0
    else:
        ratio = float(image_size) / 128.0
        diff_x = 8.0 * ratio

    reference = REFERENCE_LANDMARKS * ratio
    reference[:, 0] += diff_x

    transform, _ = cv2.estimateAffinePartial2D(landmark, reference, method=cv2.LMEDS)
    return transform


def face_alignment(image, landmark, image_size=112):
    M = _estimate_norm(landmark, image_size)
    warped = cv2.warpAffine(image, M, (image_size, image_size), borderValue=0.0)
    return warped, M


def ensure_models():
    global _models_loaded, _detector, _recognizer
    if _models_loaded:
        return
    with _model_lock:
        if _models_loaded:
            return
        print("Loading ArcFace (MobileFaceNet) + SCRFD models...", flush=True)
        _download(DETECTOR_URL, DETECTOR_PATH)
        _download(RECOGNIZER_URL, RECOGNIZER_PATH)
        _detector = SCRFD(DETECTOR_PATH)
        _recognizer = ArcFace(RECOGNIZER_PATH)
        _models_loaded = True
        print("ArcFace + SCRFD models loaded successfully!", flush=True)


@app.get("/health")
async def health():
    return {"status": "ok"}


def _decode_image(contents):
    nparr = np.frombuffer(contents, np.uint8)
    return cv2.imdecode(nparr, cv2.IMREAD_COLOR)


def _encode_jpeg(img):
    success, buf = cv2.imencode('.jpg', img)
    if not success:
        raise RuntimeError("Failed to encode image as JPEG")
    return buf


@app.post("/embed")
async def get_embedding(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        img = _decode_image(contents)

        if img is None:
            return {"success": False, "error": "Failed to decode image"}

        ensure_models()
        bboxes, kpss = _detector.detect(img, max_num=1)

        if len(bboxes) == 0:
            return {"success": False, "error": "No face detected"}

        embedding = _recognizer.get_embedding(img, kpss[0])
        return {"success": True, "embedding": embedding.tolist()}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect")
async def detect_faces(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        img = _decode_image(contents)

        if img is None:
            return {"success": False, "error": "Failed to decode image"}

        ensure_models()
        bboxes, _ = _detector.detect(img)

        faces = []
        for det in bboxes:
            x1, y1, x2, y2 = [int(v) for v in det[:4]]
            faces.append({"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1})

        return {"success": True, "faces": faces}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/embed-all")
async def embed_all_faces(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        img = _decode_image(contents)

        if img is None:
            return {"success": False, "error": "Failed to decode image"}

        ensure_models()
        bboxes, kpss = _detector.detect(img)

        results = []
        for det, kps in zip(bboxes, kpss):
            x1, y1, x2, y2 = [int(v) for v in det[:4]]

            cropped = img[y1:y2, x1:x2]
            if cropped.size == 0:
                continue

            embedding = _recognizer.get_embedding(img, kps)
            buf = _encode_jpeg(cropped)
            face_b64 = base64.b64encode(buf).decode('utf-8')

            results.append({
                "faceImage": face_b64,
                "embedding": embedding.tolist(),
                "bbox": {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
            })

        return {"success": True, "faces": results}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
