import streamlit as st
from keras.models import load_model
from PIL import Image
import numpy as np
import json
import time
import os
import cv2

# === Configuración de la página ===
st.set_page_config(
    page_title="Pokédex",
    page_icon=":sparkles:",
    layout="centered"
)

st.title("🔎 Pokédex con IA (MobileNetV2)")
st.write("Carga o toma una foto (webcam) y la Pokédex te dice qué pokémon es. ¡Ideal para juguetes, stickers y dibujos!")

# === Sliders en la barra lateral ===
st.sidebar.header("🎨 Ajustes de Cartoonizado")
nivel_color     = st.sidebar.slider("Nivel de colores (posterización)", 4, 32, 10)
canny1          = st.sidebar.slider("Bordes Canny - threshold1", 10, 200, 70)
canny2          = st.sidebar.slider("Bordes Canny - threshold2", 50, 250, 160)
bilateral_d     = st.sidebar.slider("Suavizado bilateral - d", 3, 15, 7)
bilateral_sigma = st.sidebar.slider("Suavizado bilateral - sigma", 10, 120, 50)
dilate_iter     = st.sidebar.slider("Bordes: Dilation (grosor)", 1, 5, 1)

st.sidebar.markdown("---")
threshold_conf = st.sidebar.slider(
    "Umbral confianza",      # Slider para el umbral
    min_value=0.0,
    max_value=1.0,
    value=0.25,              # <— valor por defecto reducido a 0.25
    step=0.01
)

# === Función de cartoonización tunable ===
def cartoonize(img_pil, size=(128,128),
               nivel_color=10, canny1=70, canny2=160,
               bilateral_d=7, bilateral_sigma=50, dilate_iter=1):
    # 1) Redimensionar y convertir a array
    img = img_pil.resize(size)
    img_np = np.array(img)

    # 2) Suavizado bilateral
    img_bilat = cv2.bilateralFilter(
        img_np,
        d=bilateral_d,
        sigmaColor=bilateral_sigma,
        sigmaSpace=bilateral_sigma
    )

    # 3) Posterización
    factor = max(1, 256 // nivel_color)
    img_poster = (img_bilat // factor) * factor
    img_poster = img_poster.astype(np.uint8)

    # 4) Detección de bordes
    img_gray = cv2.cvtColor(img_poster, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(img_gray, threshold1=canny1, threshold2=canny2)
    edges = cv2.dilate(edges, None, iterations=dilate_iter)

    # 5) Superponer bordes negros
    img_result = img_poster.copy()
    img_result[edges > 80] = 0

    # 6) Normalizar para el modelo
    img_result = img_result.astype(np.float32) / 255.0

    return img_result, img_poster, edges

# === Carga del modelo y clases ===
MODEL_PATH   = 'pokedex_model.keras'
CLASSES_PATH = 'clases_pokedex.json'

@st.cache_resource
def load_artifacts():
    model = load_model(MODEL_PATH)
    with open(CLASSES_PATH, 'r') as f:
        clases = json.load(f)
    return model, clases

model, clases = load_artifacts()

# === Entrada de imagen (cámara o subida) ===
img_data = st.camera_input("Toma una foto")
if not img_data:
    img_data = st.file_uploader("O sube una imagen", type=["jpg","jpeg","png"])

if img_data is not None:
    try:
        # Abrir y asegurar RGB
        img_pil = Image.open(img_data)
        if img_pil.mode == "RGBA":
            img_pil = img_pil.convert("RGB")

        # Guardar backup
        timestamp = int(time.time())
        os.makedirs("backups", exist_ok=True)
        img_pil.save(f"backups/streamlit_{timestamp}.jpg")

        # Mostrar original
        st.image(img_pil, caption="📷 Imagen original", use_column_width=True)

        # Cartoonización
        img_cartoon, img_poster, edges = cartoonize(
            img_pil,
            size=(128,128),
            nivel_color=nivel_color,
            canny1=canny1,
            canny2=canny2,
            bilateral_d=bilateral_d,
            bilateral_sigma=bilateral_sigma,
            dilate_iter=dilate_iter
        )

        # Mostrar pasos
        cols = st.columns(3)
        cols[0].image(img_poster, caption="Posterización", use_column_width=True)
        cols[1].image(edges,     caption="Bordes Canny",  use_column_width=True)
        cols[2].image((img_cartoon*255).astype(np.uint8),
                      caption="Cartoon final", use_column_width=True)

        # Preparar batch y predecir
        x = np.expand_dims(img_cartoon, axis=0)  # shape=(1,128,128,3)
        pred = model.predict(x)
        prob_max = float(np.max(pred))
        idx = int(np.argmax(pred))

        # Resultado
        st.subheader("🔎 Resultado de la Predicción")
        if prob_max < threshold_conf:
            st.warning(f"🟡 Desconocido (max prob={prob_max:.2f} < umbral={threshold_conf:.2f})")
        else:
            nombre = clases[idx].upper()
            st.success(f"🟢 {nombre} (confianza={prob_max:.2f})")

        # Detalles
        with st.expander("Ver probabilidades completas"):
            st.json({
                "clases": clases,
                "vector_probs": pred.tolist()[0],
                "indice_elegido": idx,
                "confianza_max": prob_max
            })

    except Exception as e:
        st.error(f"❌ Error: {e}")
        st.exception(e)
else:
    st.info("Sube o toma una foto para identificar el pokémon.")

st.caption("💡 Consejo: Fondos lisos y buena iluminación ayudan mucho.")
