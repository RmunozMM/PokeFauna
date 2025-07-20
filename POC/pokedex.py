#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
pokedex.py - Interfaz estilo Ash con selección de cámara.

Añade un desplegable para escoger dispositivo (0,1,2,…) y backend.
Reinicia la cámara tras selección.

Requisitos:
    pip install torch torchvision transformers pillow opencv-python numpy PyQt5

Ejemplo:
    python pokedex.py
"""

import sys
import argparse
import cv2
import torch
import numpy as np
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
from PyQt5 import QtCore, QtGui, QtWidgets

# Lista de Pokémon (1-151)

pokemon_names = [
    "Bulbasaur", "Ivysaur", "Venusaur", "Charmander", "Charmeleon", "Charizard",
    "Squirtle", "Wartortle", "Blastoise", "Caterpie", "Metapod", "Butterfree",
    "Weedle", "Kakuna", "Beedrill", "Pidgey", "Pidgeotto", "Pidgeot",
    "Rattata", "Raticate", "Spearow", "Fearow", "Ekans", "Arbok",
    "Pikachu", "Raichu", "Sandshrew", "Sandslash", "Nidoran♀", "Nidorina",
    "Nidoqueen", "Nidoran♂", "Nidorino", "Nidoking", "Clefairy", "Clefable",
    "Vulpix", "Ninetales", "Jigglypuff", "Wigglytuff", "Zubat", "Golbat",
    "Oddish", "Gloom", "Vileplume", "Paras", "Parasect", "Venonat",
    "Venomoth", "Diglett", "Dugtrio", "Meowth", "Persian", "Psyduck",
    "Golduck", "Mankey", "Primeape", "Growlithe", "Arcanine", "Poliwag",
    "Poliwhirl", "Poliwrath", "Abra", "Kadabra", "Alakazam", "Machop",
    "Machoke", "Machamp", "Bellsprout", "Weepinbell", "Victreebel", "Tentacool",
    "Tentacruel", "Geodude", "Graveler", "Golem", "Ponyta", "Rapidash",
    "Slowpoke", "Slowbro", "Magnemite", "Magneton", "Farfetch’d", "Doduo",
    "Dodrio", "Seel", "Dewgong", "Grimer", "Muk", "Shellder",
    "Cloyster", "Gastly", "Haunter", "Gengar", "Onix", "Drowzee",
    "Hypno", "Krabby", "Kingler", "Voltorb", "Electrode", "Exeggcute",
    "Exeggutor", "Cubone", "Marowak", "Hitmonlee", "Hitmonchan", "Lickitung",
    "Koffing", "Weezing", "Rhyhorn", "Rhydon", "Chansey", "Tangela",
    "Kangaskhan", "Horsea", "Seadra", "Goldeen", "Seaking", "Staryu",
    "Starmie", "Mr. Mime", "Scyther", "Jynx", "Electabuzz", "Magmar",
    "Pinsir", "Tauros", "Magikarp", "Gyarados", "Lapras", "Ditto",
    "Eevee", "Vaporeon", "Jolteon", "Flareon", "Porygon", "Omanyte",
    "Omastar", "Kabuto", "Kabutops", "Aerodactyl", "Snorlax", "Articuno",
    "Zapdos", "Moltres", "Dratini", "Dragonair", "Dragonite", "Mewtwo", "Mew"
]
def load_clip_model():
    model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)
    return model, processor, device


def prepare_text_embeddings(model, processor, device, names):
    templates = ["a photo of {name}", "a plush of {name}", "a figurine of {name}", "a toy of {name}"]
    texts = [t.format(name=n) for t in templates for n in names]
    inputs = processor(text=texts, return_tensors="pt", padding=True).to(device)
    with torch.no_grad(): feats = model.get_text_features(**inputs)
    feats = feats / feats.norm(p=2, dim=-1, keepdim=True)
    nt, npok = len(templates), len(names)
    feats = feats.view(nt, npok, -1).mean(dim=0)
    return feats / feats.norm(p=2, dim=-1, keepdim=True)


def classify_frame(frame, model, processor, device, text_feats, names):
    img = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    inputs = processor(images=img, return_tensors="pt").to(device)
    with torch.no_grad(): img_feat = model.get_image_features(**inputs)
    img_feat = img_feat / img_feat.norm(p=2, dim=-1, keepdim=True)
    sims = (img_feat @ text_feats.T)[0]
    sims -= sims.mean()
    idx = sims.argmax().item()
    score = sims[idx].item()
    return names[idx], score


class VideoThread(QtCore.QThread):
    frame_received = QtCore.pyqtSignal(object)

    def __init__(self, device=0, backend=''):
        super().__init__()
        self.running = True
        self.cap = None
        # intentar AVFoundation
        if backend == 'avfoundation':
            try:
                cap = cv2.VideoCapture(str(device), cv2.CAP_AVFOUNDATION)
                if cap.isOpened(): self.cap = cap
                else: print(f"WARNING: avfoundation no abrió {device}")
            except Exception as e:
                print(f"WARNING avfoundation: {e}")
        # fallback normal
        if self.cap is None:
            cap = cv2.VideoCapture(device)
            if cap.isOpened(): self.cap = cap
            else: print(f"ERROR: no pudo abrir cámara {device}")

    def run(self):
        while self.running and self.cap:
            ret, frame = self.cap.read()
            if ret: self.frame_received.emit(frame)
            QtCore.QThread.msleep(30)
        if self.cap: self.cap.release()

    def stop(self):
        self.running = False
        self.wait()


class MainWindow(QtWidgets.QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Pokédex de Ash")
        self.setFixedSize(820, 640)
        # modelo
        self.model, self.processor, self.device = load_clip_model()
        self.text_feats = prepare_text_embeddings(self.model, self.processor, self.device, pokemon_names)
        # UI
        central = QtWidgets.QWidget(); self.setCentralWidget(central)
        v = QtWidgets.QVBoxLayout(central)
        # selec cámara
        hsel = QtWidgets.QHBoxLayout()
        hsel.addWidget(QtWidgets.QLabel("Cámara:"))
        self.combo_cam = QtWidgets.QComboBox()
        for i in range(5): self.combo_cam.addItem(str(i))
        hsel.addWidget(self.combo_cam)
        hsel.addWidget(QtWidgets.QLabel("Backend:"))
        self.combo_bk = QtWidgets.QComboBox()
        self.combo_bk.addItem("normal", ""); self.combo_bk.addItem("avfoundation", "avfoundation")
        hsel.addWidget(self.combo_bk)
        btn_open = QtWidgets.QPushButton("Abrir cámara")
        btn_open.clicked.connect(self.restart_camera)
        hsel.addWidget(btn_open)
        v.addLayout(hsel)
        # vídeo
        self.video_label = QtWidgets.QLabel(); self.video_label.setFixedSize(800, 450)
        self.video_label.setStyleSheet("border:4px solid #444; background:#222;")
        v.addWidget(self.video_label, alignment=QtCore.Qt.AlignCenter)
        # resultado
        self.lbl = QtWidgets.QLabel("Presiona 'Abrir cámara' para iniciar")
        self.lbl.setAlignment(QtCore.Qt.AlignCenter)
        self.lbl.setStyleSheet("font-size:18px; color:#0f0;")
        v.addWidget(self.lbl)
        # capturar y salir
        hbut = QtWidgets.QHBoxLayout()
        btn_cap = QtWidgets.QPushButton("Capturar")
        btn_cap.clicked.connect(self.on_capture)
        btn_exit = QtWidgets.QPushButton("Salir")
        btn_exit.clicked.connect(self.close)
        hbut.addWidget(btn_cap); hbut.addWidget(btn_exit)
        v.addLayout(hbut)
        self.thread = None

    def restart_camera(self):
        if self.thread:
            self.thread.stop()
        cam = int(self.combo_cam.currentText())
        bk = self.combo_bk.currentData()
        self.thread = VideoThread(cam, bk)
        self.thread.frame_received.connect(self.update_frame)
        self.thread.start()
        self.lbl.setText("Muestra tu Pokémon y pulsa 'Capturar'")

    def update_frame(self, frame):
        self.current = frame
        img = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        h, w, ch = img.shape; bpl = ch*w
        q = QtGui.QImage(img.data, w, h, bpl, QtGui.QImage.Format_RGB888)
        pix = QtGui.QPixmap.fromImage(q).scaled(self.video_label.size(), QtCore.Qt.KeepAspectRatio)
        self.video_label.setPixmap(pix)

    def on_capture(self):
        if hasattr(self, 'current'):
            name, score = classify_frame(self.current, self.model, self.processor, self.device, self.text_feats, pokemon_names)
            self.lbl.setText(f"{name} ({score*100:.1f}%)")

    def closeEvent(self, e):
        if self.thread: self.thread.stop()
        e.accept()


if __name__ == '__main__':
    app = QtWidgets.QApplication(sys.argv)
    w = MainWindow(); w.show(); sys.exit(app.exec_())