import streamlit as st
from keras.models import load_model
from PIL import Image
import numpy as np
import json
import time
import os
import cv2
from sklearn.cluster import KMeans

st.set_page_config(page_title="Pokédex con IA", page_icon=":sparkles:", layout="centered")
st.title("🔎 Pokédex con IA (MobileNetV2 + Segmentación)")

# --- PARÁMETROS FIJOS ---
MODEL_PATH   = "pokedex_model.keras"
CLASSES_PATH = "clases_pokedex.json"
IMG_SIZE     = 128    # Debe coincidir con el entrenamiento

# --- FUNCIÓN DE SEGMENTACIÓN + CARTOONIZADO ---
def segment_and_cartoonize(img_pil,
                           size=(IMG_SIZE,IMG_SIZE),
                           n_colors=8,
                           bilateral_d=7, bilateral_sigma=50,
                           canny1=70, canny2=160, dilate_iter=1):
    # 1) resize + RGB→BGR
    img = img_pil.resize(size)
    img_np = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    h, w = img_np.shape[:2]

    # 2) grabCut para aislar el objeto
    mask = np.zeros((h,w), np.uint8)
    bgd, fgd = np.zeros((1,65),np.float64), np.zeros((1,65),np.float64)
    rect = (5,5, w-10, h-10)
    cv2.grabCut(img_np, mask, rect, bgd, fgd, 5, cv2.GC_INIT_WITH_RECT)
    mask2 = np.where((mask==2)|(mask==0), 0, 1).astype("uint8")
    obj = img_np * mask2[:,:,None]

    # 3) quantización con K-Means
    pixels = obj.reshape(-1,3)
    non_bg = pixels.sum(axis=1) > 0
    km = KMeans(n_clusters=n_colors, n_init=4)
    km.fit(pixels[non_bg])
    centers = km.cluster_centers_.astype("uint8")
    labels  = km.predict(pixels[non_bg])
    quant = np.zeros_like(pixels)
    quant[non_bg] = centers[labels]
    quant = quant.reshape(h,w,3)

    # 4) cartoon: bilateral + canny + dilate + pintar bordes
    img_bilat = cv2.bilateralFilter(quant, d=bilateral_d,
                                    sigmaColor=bilateral_sigma,
                                    sigmaSpace=bilateral_sigma)
    gray = cv2.cvtColor(img_bilat, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, threshold1=canny1, threshold2=canny2)
    edges = cv2.dilate(edges, None, iterations=dilate_iter)
    img_bilat[edges>0] = 0

    # 5) BGR→RGB + normalización [0,1]
    final = cv2.cvtColor(img_bilat, cv2.COLOR_BGR2RGB).astype(np.float32)/255.0
    return final, quant, edges

# --- CARGA MODELO Y CLASES ---
@st.cache_resource
def load_artifacts():
    m = load_model(MODEL_PATH)
    with open(CLASSES_PATH,"r") as f:
        classes = json.load(f)
    return m, classes

model, classes = load_artifacts()
threshold = 0.5

# --- INPUT STREAMLIT ---
img_data = st.camera_input("Toma una foto")
if not img_data:
    img_data = st.file_uploader("O sube una imagen", type=["jpg","jpeg","png"])

if img_data:
    img_pil = Image.open(img_data)
    if img_pil.mode=="RGBA":
        img_pil = img_pil.convert("RGB")

    # guardado opcional
    os.makedirs("backups", exist_ok=True)
    img_pil.save(f"backups/{int(time.time())}.jpg")

    st.image(img_pil, caption="Original", use_column_width=True)

    # PROCESADO
    final, quant, edges = segment_and_cartoonize(img_pil)

    # mostrar pasos
    cols = st.columns(3)
    with cols[0]:
        st.image((quant).astype("uint8"), caption="Quantización", use_column_width=True)
    with cols[1]:
        st.image(edges,            caption="Bordes Canny",  use_column_width=True)
    with cols[2]:
        st.image((final*255).astype("uint8"), caption="Cartoon Final", use_column_width=True)

    # PREDICCIÓN
    x = np.expand_dims(final, axis=0)
    pred = model.predict(x)[0]
    idx  = int(np.argmax(pred))
    prob = float(np.max(pred))

    if prob < threshold:
        st.warning(f"🟡 Desconocido (conf={prob:.2f} < {threshold:.2f})")
    else:
        st.success(f"🟢 {classes[idx].upper()} (confianza={prob:.2f})")

    with st.expander("Ver probabilidades"):
        st.json({
            "clases": classes,
            "vector_probs": pred.tolist(),
            "indice_elegido": idx,
            "confianza_max": prob
        })
else:
    st.info("Sube o toma una foto para identificar el pokémon.")

st.caption("💡 Fondos limpios y buena iluminación ayudan muchísimo.")
