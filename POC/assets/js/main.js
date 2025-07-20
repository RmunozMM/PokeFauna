const screen = document.getElementById("screen");
const btnCamara = document.getElementById("btnCamara");
const btnBuscarNombre = document.getElementById("btnBuscarNombre");
const btnA = document.getElementById("btnA");
const btnB = document.getElementById("btnB");
const btnC = document.getElementById("btnC");
const btnD = document.getElementById("btnD"); // New D button
const orientationMessage = document.getElementById("orientationMessage");
const pokedexElement = document.querySelector(".pokedex");
const footerTextElement = document.querySelector(".footer-text");

let currentStream = null;
let videoDevices = [];
let currentDeviceIndex = 0;
let currentDisplayedSpecies = null;
let isCameraActive = false;
let reportCameraStream = null; // Stream for the report sighting camera

// Array para almacenar todas las especies (simuladas)
let mySpeciesData = [
  {
    id: 1,
    name: "Labrador Retriever",
    scientificName: "Canis lupus familiaris",
    habitat: "Doméstico",
    weight: "25-36 kg",
    diet: "Omnívora",
    conservationStatus: "Doméstico",
    imageUrl:
      "https://images.dog.ceo/breeds/retriever-labrador/n02099712_8407.jpg",
    description: "Un perro amigable y enérgico, ideal para familias.",
  },
  {
    id: 2,
    name: "Pastor Alemán",
    scientificName: "Canis lupus familiaris",
    habitat: "Doméstico, trabajo",
    weight: "22-40 kg",
    diet: "Omnívora",
    conservationStatus: "Doméstico",
    imageUrl: "https://images.dog.ceo/breeds/germanshepherd/n02100907_1268.jpg",
    description: "Inteligente y leal, a menudo usado como perro de trabajo.",
  },
  {
    id: 3,
    name: "Golden Retriever",
    scientificName: "Canis lupus familiaris",
    habitat: "Doméstico",
    weight: "25-34 kg",
    diet: "Omnívora",
    conservationStatus: "Doméstico",
    imageUrl:
      "https://images.dog.ceo/breeds/retriever-golden/n02099601_1305.jpg",
    description: "Conocido por su pelaje dorado y temperamento amable.",
  },
  {
    id: 4,
    name: "Poodle",
    scientificName: "Canis lupus familiaris",
    habitat: "Doméstico",
    weight: "4-32 kg",
    diet: "Omnívora",
    conservationStatus: "Doméstico",
    imageUrl:
      "https://images.dog.ceo/breeds/poodle-miniature/n02113712_1703.jpg",
    description: "Elegante y muy inteligente, con un pelaje característico.",
  },
  {
    id: 5,
    name: "Bulldog Francés",
    scientificName: "Canis lupus familiaris",
    habitat: "Doméstico",
    weight: "8-14 kg",
    diet: "Omnívora",
    conservationStatus: "Doméstico",
    imageUrl: "https://images.dog.ceo/breeds/bulldog-french/n02108915_1280.jpg",
    description: "Pequeño y robusto, con orejas de murciélago distintivas.",
  },
  {
    id: 6,
    name: "Chihuahua",
    scientificName: "Canis lupus familiaris",
    habitat: "Doméstico",
    weight: "1-3 kg",
    diet: "Omnívora",
    conservationStatus: "Doméstico",
    imageUrl: "https://images.dog.ceo/breeds/chihuahua/n02085620_10074.jpg",
  },
  {
    id: 7,
    name: "Siberian Husky",
    scientificName: "Canis lupus familiaris",
    habitat: "Doméstico, frío",
    weight: "16-27 kg",
    diet: "Omnívora",
    conservationStatus: "Doméstico",
    imageUrl: "https://images.dog.ceo/breeds/husky/n02109961_1001.jpg",
  },
];

// Array para almacenar las especies que el usuario ha "registrado"
let userRegisteredSpecies = [
  // Ejemplo de especies ya registradas si quisieras precargar algunas
  {
    id: 1,
    name: "Labrador Retriever",
    scientificName: "Canis lupus familiaris",
    habitat: "Doméstico",
    weight: "25-36 kg",
    diet: "Omnívora",
    conservationStatus: "Doméstico",
    imageUrl:
      "https://images.dog.ceo/breeds/retriever-labrador/n02099712_8407.jpg",
    description: "Un perro amigable y enérgico, ideal para familias.",
    timestamp: new Date(2024, 5, 10, 10, 30), // Ejemplo de fecha y hora de avistamiento
    sightingImageUrl:
      "https://images.dog.ceo/breeds/retriever-labrador/n02099712_8407.jpg", // Example sighting image
  },
];

// Function to handle orientation changes
function checkOrientation() {
  if (window.innerHeight > window.innerWidth) {
    // Portrait mode
    pokedexElement.style.display = "none";
    footerTextElement.style.display = "none";
    orientationMessage.style.display = "flex";
    stopCameraStream(); // Stop main camera if active
    stopReportCameraStream(); // Stop report camera if active
    isCameraActive = false;
    btnCamara.textContent = "Abrir cámara";
  } else {
    // Landscape mode
    pokedexElement.style.display = "flex";
    footerTextElement.style.display = "block";
    orientationMessage.style.display = "none";
  }
}

// Initial check on load
window.addEventListener("load", checkOrientation);
// Listen for orientation changes
window.addEventListener("resize", checkOrientation);

// Function to stop the current camera stream (main camera)
function stopCameraStream() {
  if (currentStream) {
    currentStream.getTracks().forEach((track) => {
      track.stop();
    });
    currentStream = null;
  }
}

// Function to stop the report sighting camera stream
function stopReportCameraStream() {
  if (reportCameraStream) {
    reportCameraStream.getTracks().forEach((track) => track.stop());
    reportCameraStream = null;
  }
}

/**
 * Muestra un mensaje temporal en la pantalla principal.
 * @param {string} message - El texto del mensaje.
 * @param {'info'|'success'|'error'} type - El tipo de mensaje para estilizado (info, success, error).
 * @param {number} duration - Duración en milisegundos antes de volver a la pantalla inicial.
 */
function showMessage(message, type = "info") {
  // Removed duration parameter
  screen.innerHTML = `
        <div class="message-container message-${type}">
            <p>${message}</p>
            <button class="back-button" onclick="showInitialScreenButtons()">Volver al Menú</button>
        </div>
    `;
  toggleButtons(false); // Ensure buttons are enabled so "Volver" button is clickable
}

/**
 * Habilita o deshabilita los botones principales de la interfaz.
 * @param {boolean} disable - Si es true, deshabilita los botones; si es false, los habilita.
 */
function toggleButtons(disable) {
  const buttons = [btnA, btnB, btnC, btnD, btnBuscarNombre, btnCamara];
  buttons.forEach((button) => {
    button.disabled = disable;
    if (disable) {
      button.classList.add("disabled");
    } else {
      button.classList.remove("disabled");
    }
  });
}

// Function to display the initial screen with "Abrir Cámara" and "Buscar por Nombre" buttons
function showInitialScreenButtons() {
  stopCameraStream(); // Ensure main camera is off
  stopReportCameraStream(); // Ensure report camera is off
  isCameraActive = false; // Reset camera state
  btnCamara.textContent = "Abrir cámara"; // Reset camera button text
  toggleButtons(false); // Enable all buttons

  screen.innerHTML = `
    <div class="screen-initial-buttons">
      <div class="btn" id="screenBtnCamara">Abrir Cámara</div>
      <div class="btn" id="screenBtnBuscarNombre">Buscar por Nombre</div>
      <div class="btn" id="screenBtnReportSighting">Reportar Avistamiento</div>
    </div>
  `;
  // Add event listeners for the new screen buttons
  document.getElementById("screenBtnCamara").addEventListener("click", () => {
    // Simulate click on the actual camera button in the left panel
    btnCamara.click();
  });
  document
    .getElementById("screenBtnBuscarNombre")
    .addEventListener("click", showSearchByNameInput);
  document
    .getElementById("screenBtnReportSighting")
    .addEventListener("click", showReportSightingScreen); // New event listener
}

// Function to display the search input field
function showSearchByNameInput() {
  stopCameraStream(); // Ensure main camera is off
  stopReportCameraStream(); // Ensure report camera is off
  isCameraActive = false; // Reset camera state
  btnCamara.textContent = "Abrir cámara"; // Reset camera button text
  toggleButtons(false); // Ensure buttons are enabled when entering search

  screen.innerHTML = `
    <div class="search-input-container">
      <p>Busca una especie por nombre:</p>
      <input type="text" id="speciesNameInput" placeholder="Ej: Labrador Retriever" class="search-input">
      <button id="btnSearchByName" class="search-button">Buscar</button>
    </div>
  `;
  // Add event listener for the new search button
  document
    .getElementById("btnSearchByName")
    .addEventListener("click", searchSpeciesByName);
}

// Function to display species details
function displaySpeciesDetails(speciesData) {
  screen.innerHTML = `
      <div class="species-container">
        <div class="species-img">
          <img src="${speciesData.imageUrl}" alt="${
    speciesData.name
  }" onerror="this.onerror=null;this.src='https://placehold.co/100x100/CCCCCC/000000?text=No+Img';">
        </div>
        <div class="species-info">
          <h2>${speciesData.name}</h2>
          <p><strong>Nombre científico:</strong> ${
            speciesData.scientificName
          }</p>
          <p><strong>Hábitat:</strong> ${speciesData.habitat}</p>
          <p><strong>Peso promedio:</strong> ${speciesData.weight}</p>
          <p><strong>Alimentación:</strong> ${speciesData.diet}</p>
          <p><strong>Estado de conservación:</strong> ${
            speciesData.conservationStatus
          }</p>
          <p><strong>Descripción:</strong> ${
            speciesData.description || "No hay descripción disponible."
          }</p>
        </div>
      </div>
    `;
  currentDisplayedSpecies = speciesData; // Store for registration
  toggleButtons(false); // Enable buttons after displaying details
}

// Function to perform species search by name
function searchSpeciesByName() {
  const input = document.getElementById("speciesNameInput");
  const searchTerm = input.value.toLowerCase().trim();

  toggleButtons(true); // Disable buttons during search

  if (!searchTerm) {
    showMessage("Por favor, ingresa un nombre para buscar.", "error");
    input.classList.add("error-input"); // Add visual cue for empty input
    // No toggleButtons(false) here, as showMessage will handle it
    return;
  } else {
    input.classList.remove("error-input");
  }

  screen.innerHTML =
    '<p class="welcome-text message-info">Buscando especie...</p>'; // Show searching message

  const foundSpecies = mySpeciesData.find(
    (species) =>
      species.name.toLowerCase().includes(searchTerm) ||
      species.scientificName.toLowerCase().includes(searchTerm)
  );

  setTimeout(() => {
    // Simulate a delay for search
    if (foundSpecies) {
      displaySpeciesDetails(foundSpecies);
    } else {
      showMessage(`Especie "${searchTerm}" no encontrada.`, "error");
    }
  }, 1000); // 1 second delay for search
}

// Function to start the camera (main camera)
async function startCamera(deviceId = null) {
  stopCameraStream(); // Stop any existing stream
  stopReportCameraStream(); // Ensure report camera is off
  isCameraActive = true; // Set camera state
  btnCamara.textContent = "Analizar Foto"; // Change button text
  toggleButtons(true); // Disable buttons during camera operation

  const constraints = {
    video: {
      deviceId: deviceId ? { exact: deviceId } : undefined, // Use deviceId if specified
      facingMode: deviceId ? undefined : "environment", // Prefer rear camera if no deviceId
    },
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;

    const videoElement = document.createElement("video");
    videoElement.style.width = "100%";
    videoElement.style.height = "100%";
    videoElement.style.objectFit = "cover";
    videoElement.autoplay = true;
    videoElement.playsInline = true; // Important for iOS

    videoElement.srcObject = stream;

    screen.innerHTML = ""; // Clear previous content
    screen.appendChild(videoElement);

    // Add button to switch camera if more than one is available
    if (videoDevices.length > 1) {
      const cameraControlsDiv = document.createElement("div");
      cameraControlsDiv.className = "camera-controls";

      const switchCameraButton = document.createElement("button");
      switchCameraButton.className = "camera-btn";
      switchCameraButton.textContent = "Cambiar Cámara";
      switchCameraButton.addEventListener("click", switchCamera);
      cameraControlsDiv.appendChild(switchCameraButton);

      screen.appendChild(cameraControlsDiv);
    }

    videoElement.onloadedmetadata = () => {
      videoElement.play();
      toggleButtons(false); // Enable buttons once camera feed is ready
    };
  } catch (error) {
    console.error("Error al acceder a la cámara:", error);
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      showMessage("Permiso de cámara denegado.", "error");
    } else if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      showMessage("No se encontró ninguna cámara.", "error");
    } else {
      showMessage("Error al abrir la cámara.", "error");
    }
    isCameraActive = false; // Reset camera state on error
    btnCamara.textContent = "Abrir cámara"; // Reset button text on error
    toggleButtons(false); // Re-enable buttons on error
  }
}

// Function to switch to the next available camera
async function switchCamera() {
  if (videoDevices.length <= 1) {
    console.log("Solo hay una cámara disponible o ninguna.");
    return;
  }

  currentDeviceIndex = (currentDeviceIndex + 1) % videoDevices.length;
  const nextDeviceId = videoDevices[currentDeviceIndex].deviceId;
  await startCamera(nextDeviceId);
}

// Function to simulate taking a photo and analyzing it
function analyzePhoto() {
  stopCameraStream(); // Stop the camera after "taking" the photo
  isCameraActive = false; // Reset camera state
  btnCamara.textContent = "Abrir cámara"; // Reset button text
  toggleButtons(true); // Disable buttons during analysis

  showMessage("Analizando imagen...", "info"); // Show analyzing message

  // Simulate API call for analysis - pick a random species from mySpeciesData
  const randomIndex = Math.floor(Math.random() * mySpeciesData.length);
  const analyzedSpecies = mySpeciesData[randomIndex];

  setTimeout(() => {
    // Simulate a delay for analysis
    displaySpeciesDetails(analyzedSpecies);
  }, 1500); // 1.5 seconds delay
}

// Event listener for the "Abrir cámara" / "Analizar Foto" button in the left panel
btnCamara.addEventListener("click", async () => {
  if (!isCameraActive) {
    // If camera is not active, start it
    if (videoDevices.length === 0) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        videoDevices = devices.filter((device) => device.kind === "videoinput");
        if (videoDevices.length === 0) {
          showMessage("No se encontraron dispositivos de video.", "error");
          return;
        }
      } catch (error) {
        console.error("Error al enumerar dispositivos:", error);
        showMessage("Error al acceder a los dispositivos de video.", "error");
        return;
      }
    }
    await startCamera(videoDevices[currentDeviceIndex].deviceId);
  } else {
    // If camera is active, analyze the photo
    analyzePhoto();
  }
});

// Event listener for the "Buscar por Nombre" button in the left panel
btnBuscarNombre.addEventListener("click", showSearchByNameInput);

// Button A: Geoposicionar
btnA.addEventListener("click", () => {
  stopCameraStream(); // Stop the camera if active
  stopReportCameraStream(); // Ensure report camera is off
  isCameraActive = false; // Reset camera state
  btnCamara.textContent = "Abrir cámara"; // Reset camera button text
  toggleButtons(true); // Disable buttons during GPS operation

  if (navigator.geolocation) {
    showMessage("Obteniendo ubicación...", "info"); // Show loading message for longer

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const latFixed = lat.toFixed(4);
        const lonFixed = lon.toFixed(4);

        // Attempt to get location name using Nominatim API
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;

        try {
          const response = await fetch(nominatimUrl);
          const data = await response.json();
          let locationName = "Ubicación desconocida";

          if (data.display_name) {
            locationName = data.display_name;
          } else if (data.address) {
            // Fallback for more specific address components
            const address = data.address;
            locationName =
              address.road ||
              address.neighbourhood ||
              address.city ||
              address.town ||
              address.village ||
              address.country ||
              "Ubicación desconocida";
          }

          // Generate a static map image URL
          const mapImageUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${
            lon - 0.01
          },${lat - 0.005},${lon + 0.01},${
            lat + 0.005
          }&layer=mapnik&marker=${lat},${lon}`;

          screen.innerHTML = `
            <div class="map-container">
                <iframe class="map-iframe" src="${mapImageUrl}" frameborder="0" scrolling="no" marginheight="0" marginwidth="0"></iframe>
                <div class="map-info">
                    <p><strong>Ubicación:</strong> ${locationName}</p>
                    <p>Lat: ${latFixed}, Lon: ${lonFixed}</p>
                </div>
                <div class="back-button-container">
                    <button class="back-button" onclick="showInitialScreenButtons()">Volver al Menú</button>
                </div>
            </div>
            `;
          toggleButtons(false); // Enable buttons after displaying result
        } catch (apiError) {
          console.error(
            "Error al obtener el nombre de la ubicación o el mapa:",
            apiError
          );
          showMessage(
            `Estás en: <br>Lat: ${latFixed}<br>Lon: ${lonFixed}<br><span style="font-size: 0.7rem;">(No se pudo obtener el nombre o el mapa)</span>`,
            "error"
          );
          // showMessage already handles re-enabling buttons and returning to main menu
        }
      },
      (error) => {
        console.error("Error de geolocalización:", error);
        let errorMessage = "Error al obtener la ubicación.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permiso de ubicación denegado.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Ubicación no disponible.";
            break;
          case error.TIMEOUT:
            errorMessage = "Tiempo de espera agotado al obtener la ubicación.";
            break;
        }
        showMessage(errorMessage, "error");
        // showMessage already handles re-enabling buttons and returning to main menu
      }
    );
  } else {
    showMessage("Tu navegador no soporta geolocalización.", "error");
    // showMessage already handles re-enabling buttons and returning to main menu
  }
});

// Button B: Registrar esta especie (simulado en memoria)
btnB.addEventListener("click", () => {
  stopCameraStream(); // Stop the camera if active
  stopReportCameraStream(); // Ensure report camera is off
  isCameraActive = false; // Reset camera state
  btnCamara.textContent = "Abrir cámara"; // Reset camera button text
  toggleButtons(true); // Disable buttons during registration

  if (!currentDisplayedSpecies) {
    showMessage(
      "No hay especie para registrar. Consulta una primero.",
      "error"
    );
    // showMessage already handles re-enabling buttons and returning to main menu
    return;
  }

  // Check if species already exists in userRegisteredSpecies to avoid duplicates
  const exists = userRegisteredSpecies.some(
    (s) => s.id === currentDisplayedSpecies.id
  );
  if (exists) {
    showMessage("¡Esta especie ya está registrada!", "info"); // Changed to info, as it's not an error
    // showMessage already handles re-enabling buttons and returning to main menu
    return;
  }

  // Simulate saving by adding to the in-memory array
  userRegisteredSpecies.push({
    ...currentDisplayedSpecies,
    timestamp: new Date(),
  });
  showMessage("¡Especie registrada con éxito!", "success");
  currentDisplayedSpecies = null; // Clear after registration
  console.log("Especies registradas (en memoria):", userRegisteredSpecies);
  // showMessage already handles re-enabling buttons and returning to main menu
});

// Function to display registered species from in-memory array
function displayRegisteredSpecies() {
  stopCameraStream(); // Stop the camera if active
  stopReportCameraStream(); // Ensure report camera is off
  isCameraActive = false; // Reset camera state
  btnCamara.textContent = "Abrir cámara"; // Reset camera button text
  toggleButtons(true); // Disable buttons while loading list

  if (userRegisteredSpecies.length === 0) {
    showMessage("Aún no has registrado ninguna especie.", "info");
    // showMessage already handles re-enabling buttons and returning to main menu
    return;
  }

  let speciesHtml = '<div class="species-list-main-container">';
  speciesHtml += "<h2>Mis Avistamientos</h2>"; // Title for the list

  // Sort species by name for consistent display
  const sortedSpecies = [...userRegisteredSpecies].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sortedSpecies.forEach((sighting) => {
    // Changed to sighting as it's a registered avistamiento
    speciesHtml += `
            <div class="species-list-card">
                <img src="${
                  sighting.sightingImageUrl ||
                  sighting.imageUrl ||
                  "https://placehold.co/100x100/CCCCCC/000000?text=No+Img"
                }" alt="${sighting.name}">
                <h3>${sighting.name}</h3>
                <p><strong>Nombre científico:</strong> ${
                  sighting.scientificName
                }</p>
                <p><strong>Hábitat:</strong> ${sighting.habitat}</p>
                <p><strong>Peso promedio:</strong> ${sighting.weight}</p>
                <p><strong>Alimentación:</strong> ${sighting.diet}</p>
                <p><strong>Estado de conservación:</strong> ${
                  sighting.conservationStatus
                }</p>
                <p><strong>Fecha Avistamiento:</strong> ${
                  sighting.timestamp
                    ? sighting.timestamp.toLocaleString()
                    : "N/A"
                }</p>
                <p><strong>Ubicación:</strong> ${sighting.location || "N/A"}</p>
                <p><strong>Notas:</strong> ${sighting.notes || "N/A"}</p>
            </div>
        `;
  });
  speciesHtml += `
      <div class="back-button-container">
          <button class="back-button" onclick="showInitialScreenButtons()">Volver al Menú</button>
      </div>
    `;
  speciesHtml += "</div>"; // Close species-list-main-container
  screen.innerHTML = speciesHtml;
  toggleButtons(false); // Enable buttons after displaying list
}

// NEW: Function to show the report sighting form
function showReportSightingScreen() {
  stopCameraStream(); // Stop main camera
  stopReportCameraStream(); // Ensure report camera is off initially
  isCameraActive = false; // Reset main camera state
  btnCamara.textContent = "Abrir cámara"; // Reset main camera button text
  toggleButtons(false); // Enable buttons

  const now = new Date();
  const formattedDate = now.toISOString().slice(0, 16); // Format for datetime-local input

  screen.innerHTML = `
        <div class="report-sighting-container">
            <h2>Reportar Avistamiento</h2>
            <div class="report-input-group">
                <label for="reportSpeciesName">Especie:</label>
                <input type="text" id="reportSpeciesName" class="report-input" placeholder="Nombre de la especie" list="speciesSuggestions">
                <datalist id="speciesSuggestions">
                    ${mySpeciesData
                      .map((s) => `<option value="${s.name}"></option>`)
                      .join("")}
                </datalist>
            </div>
            <div class="report-input-group">
                <label for="reportLocation">Ubicación (GPS):</label>
                <input type="text" id="reportLocation" class="report-input" placeholder="Obteniendo ubicación..." readonly>
                <input type="hidden" id="reportLat">
                <input type="hidden" id="reportLon">
            </div>
            <div class="report-input-group">
                <label for="reportDateTime">Fecha y Hora:</label>
                <input type="datetime-local" id="reportDateTime" class="report-input" value="${formattedDate}">
            </div>
            <div class="report-input-group">
                <label for="reportNotes">Notas (opcional):</label>
                <textarea id="reportNotes" class="report-textarea" placeholder="Observaciones adicionales..."></textarea>
            </div>

            <div class="report-input-group camera-upload-section">
                <label>Adjuntar Imagen:</label>
                <div class="camera-preview-container">
                    <video id="reportVideoPreview" autoplay playsinline class="camera-preview"></video>
                    <canvas id="reportCanvas" class="camera-canvas"></canvas>
                    <img id="reportCapturedImage" class="captured-image" style="display:none;">
                </div>
                <div class="camera-upload-buttons">
                    <button id="btnStartReportCamera" class="report-button small-button">Abrir Cámara</button>
                    <button id="btnCaptureReportPhoto" class="report-button small-button" style="display:none;">Tomar Foto</button>
                    <input type="file" id="reportImageUpload" accept="image/*" style="display:none;">
                    <button id="btnUploadImage" class="report-button small-button">Subir Foto</button>
                </div>
            </div>
            <input type="hidden" id="sightingImageData"> <!-- To store base64 image -->

            <button id="btnSaveSighting" class="report-button">Guardar Avistamiento</button>
            <button class="back-button" onclick="showInitialScreenButtons()">Volver al Menú</button>
        </div>
    `;

  // Auto-fill GPS location
  const reportLocationInput = document.getElementById("reportLocation");
  const reportLatInput = document.getElementById("reportLat");
  const reportLonInput = document.getElementById("reportLon");

  if (navigator.geolocation) {
    reportLocationInput.value = "Obteniendo ubicación...";
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        reportLatInput.value = lat;
        reportLonInput.value = lon;

        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
        try {
          const response = await fetch(nominatimUrl);
          const data = await response.json();
          let locationName = `Lat: ${lat.toFixed(4)}, Lon: ${lon.toFixed(4)}`;
          if (data.display_name) {
            locationName = data.display_name;
          }
          reportLocationInput.value = locationName;
        } catch (apiError) {
          console.error(
            "Error al obtener el nombre de la ubicación:",
            apiError
          );
          reportLocationInput.value = `Lat: ${lat.toFixed(
            4
          )}, Lon: ${lon.toFixed(4)} (Nombre no disponible)`;
        }
      },
      (error) => {
        console.error("Error de geolocalización:", error);
        reportLocationInput.value = "Ubicación no disponible";
      }
    );
  } else {
    reportLocationInput.value = "Geolocalización no soportada";
  }

  document
    .getElementById("btnSaveSighting")
    .addEventListener("click", saveSighting);
  document
    .getElementById("btnStartReportCamera")
    .addEventListener("click", startReportCamera);
  document
    .getElementById("btnCaptureReportPhoto")
    .addEventListener("click", takeReportPhoto);
  document
    .getElementById("btnUploadImage")
    .addEventListener("click", () =>
      document.getElementById("reportImageUpload").click()
    );
  document
    .getElementById("reportImageUpload")
    .addEventListener("change", handleFileUpload);
}

// NEW: Function to start the camera for reporting
async function startReportCamera() {
  stopReportCameraStream(); // Stop any existing stream
  const video = document.getElementById("reportVideoPreview");
  const canvas = document.getElementById("reportCanvas");
  const capturedImage = document.getElementById("reportCapturedImage");
  const btnStartCamera = document.getElementById("btnStartReportCamera");
  const btnCapturePhoto = document.getElementById("btnCaptureReportPhoto");
  const btnUploadImage = document.getElementById("btnUploadImage");
  const fileInput = document.getElementById("reportImageUpload");

  video.style.display = "block";
  canvas.style.display = "none";
  capturedImage.style.display = "none";
  btnStartCamera.textContent = "Cerrar Cámara"; // Change button text
  btnCapturePhoto.style.display = "block";
  btnUploadImage.style.display = "none"; // Hide upload button when camera is open
  fileInput.style.display = "none"; // Hide file input

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    });
    reportCameraStream = stream;
    video.srcObject = stream;
    video.play();
    btnStartCamera.removeEventListener("click", startReportCamera);
    btnStartCamera.addEventListener("click", stopAndResetReportCamera);
  } catch (error) {
    console.error("Error al acceder a la cámara para reportar:", error);
    showMessage("Error al abrir la cámara para avistamiento.", "error"); // Removed duration
    stopAndResetReportCamera();
  }
}

// NEW: Function to stop and reset the report camera
function stopAndResetReportCamera() {
  stopReportCameraStream();
  const video = document.getElementById("reportVideoPreview");
  const canvas = document.getElementById("reportCanvas");
  const capturedImage = document.getElementById("reportCapturedImage");
  const btnStartCamera = document.getElementById("btnStartReportCamera");
  const btnCapturePhoto = document.getElementById("btnCaptureReportPhoto");
  const btnUploadImage = document.getElementById("btnUploadImage");
  const fileInput = document.getElementById("reportImageUpload");

  video.style.display = "none";
  canvas.style.display = "none";
  capturedImage.style.display = "none";
  video.srcObject = null;

  btnStartCamera.textContent = "Abrir Cámara";
  btnCapturePhoto.style.display = "none";
  btnUploadImage.style.display = "block"; // Show upload button again
  fileInput.style.display = "none"; // Keep file input hidden, triggered by button

  btnStartCamera.removeEventListener("click", stopAndResetReportCamera);
  btnStartCamera.addEventListener("click", startReportCamera);
  document.getElementById("sightingImageData").value = ""; // Clear stored image data
}

// NEW: Function to take a photo from the report camera
function takeReportPhoto() {
  const video = document.getElementById("reportVideoPreview");
  const canvas = document.getElementById("reportCanvas");
  const capturedImage = document.getElementById("reportCapturedImage");
  const sightingImageDataInput = document.getElementById("sightingImageData");

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL("image/png"); // Get image as base64

    capturedImage.src = imageData;
    capturedImage.style.display = "block";
    video.style.display = "none"; // Hide video
    canvas.style.display = "none"; // Hide canvas

    sightingImageDataInput.value = imageData; // Store base64 data

    stopReportCameraStream(); // Stop camera after capture
    document.getElementById("btnStartReportCamera").textContent =
      "Abrir Cámara";
    document.getElementById("btnCaptureReportPhoto").style.display = "none";
    document.getElementById("btnUploadImage").style.display = "block"; // Show upload button again
    document
      .getElementById("btnStartReportCamera")
      .removeEventListener("click", stopAndResetReportCamera);
    document
      .getElementById("btnStartReportCamera")
      .addEventListener("click", startReportCamera);
  } else {
    showMessage("Cámara no lista para tomar foto.", "error"); // Removed duration
  }
}

// NEW: Function to handle file upload for reporting
function handleFileUpload(event) {
  const file = event.target.files[0];
  const capturedImage = document.getElementById("reportCapturedImage");
  const sightingImageDataInput = document.getElementById("sightingImageData");
  const video = document.getElementById("reportVideoPreview");
  const canvas = document.getElementById("reportCanvas");

  stopReportCameraStream(); // Ensure camera is off
  video.style.display = "none";
  canvas.style.display = "none";

  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      capturedImage.src = e.target.result;
      capturedImage.style.display = "block";
      sightingImageDataInput.value = e.target.result; // Store base64 data
    };
    reader.readAsDataURL(file);
  } else {
    capturedImage.style.display = "none";
    sightingImageDataInput.value = "";
  }
}

// NEW: Function to save the reported sighting
function saveSighting() {
  const speciesNameInput = document.getElementById("reportSpeciesName");
  const locationInput = document.getElementById("reportLocation");
  const latInput = document.getElementById("reportLat");
  const lonInput = document.getElementById("reportLon");
  const dateTimeInput = document.getElementById("reportDateTime");
  const notesInput = document.getElementById("reportNotes");
  const sightingImageDataInput = document.getElementById("sightingImageData"); // Get image data

  const speciesName = speciesNameInput.value.trim();
  const location = locationInput.value.trim();
  const latitude = parseFloat(latInput.value);
  const longitude = parseFloat(lonInput.value);
  const dateTime = new Date(dateTimeInput.value);
  const notes = notesInput.value.trim();
  const sightingImageUrl = sightingImageDataInput.value; // Get the base64 image URL

  // Disable save button to prevent multiple submissions
  const btnSaveSighting = document.getElementById("btnSaveSighting");
  btnSaveSighting.disabled = true;
  btnSaveSighting.classList.add("disabled");
  toggleButtons(true); // Disable all main buttons

  if (!speciesName) {
    showMessage("Por favor, ingresa el nombre de la especie.", "error"); // Removed duration
    speciesNameInput.classList.add("error-input");
    btnSaveSighting.disabled = false; // Re-enable
    btnSaveSighting.classList.remove("disabled");
    toggleButtons(false); // Re-enable main buttons
    return;
  } else {
    speciesNameInput.classList.remove("error-input");
  }

  if (
    location === "Obteniendo ubicación..." ||
    location === "Ubicación no disponible" ||
    location === "Geolocalización no soportada"
  ) {
    showMessage(
      "Por favor, espera a que se obtenga la ubicación o ingresa una manualmente si es necesario.",
      "error"
    ); // Removed duration
    locationInput.classList.add("error-input");
    btnSaveSighting.disabled = false; // Re-enable
    btnSaveSighting.classList.remove("disabled");
    toggleButtons(false); // Re-enable main buttons
    return;
  } else {
    locationInput.classList.remove("error-input");
  }

  // Find the species in mySpeciesData to get its full details for registration
  const foundSpecies = mySpeciesData.find(
    (s) => s.name.toLowerCase() === speciesName.toLowerCase()
  );

  if (!foundSpecies) {
    showMessage(
      `Especie "${speciesName}" no encontrada en la base de datos. Por favor, selecciona una de la lista.`,
      "error"
    ); // Removed duration
    speciesNameInput.classList.add("error-input");
    btnSaveSighting.disabled = false; // Re-enable
    btnSaveSighting.classList.remove("disabled");
    toggleButtons(false); // Re-enable main buttons
    return;
  } else {
    speciesNameInput.classList.remove("error-input");
  }

  // Create a new unique ID for the sighting
  const newSightingId =
    userRegisteredSpecies.length > 0
      ? Math.max(...userRegisteredSpecies.map((s) => s.id)) + 1
      : 1;

  const newSighting = {
    id: newSightingId, // Unique ID for the sighting
    speciesId: foundSpecies.id, // Link to the species data
    name: foundSpecies.name,
    scientificName: foundSpecies.scientificName,
    imageUrl: foundSpecies.imageUrl, // Original species image
    habitat: foundSpecies.habitat,
    weight: foundSpecies.weight,
    diet: foundSpecies.diet,
    conservationStatus: foundSpecies.conservationStatus,
    description: foundSpecies.description,
    location: location,
    latitude: latitude,
    longitude: longitude,
    timestamp: dateTime,
    notes: notes,
    sightingImageUrl: sightingImageUrl, // The captured/uploaded image for this specific sighting
  };

  userRegisteredSpecies.push(newSighting);
  console.log("Nuevo avistamiento registrado:", newSighting);
  console.log("Todos los avistamientos:", userRegisteredSpecies);

  showMessage("¡Avistamiento guardado con éxito!", "success");
  // Reset button state and re-enable main buttons handled by showMessage -> showInitialScreenButtons
}

// New button event listener for btnC (Mis Especies)
btnC.addEventListener("click", displayRegisteredSpecies);

// New button event listener for btnD (Home)
btnD.addEventListener("click", showInitialScreenButtons);

// Initial state: show initial screen buttons
showInitialScreenButtons();
