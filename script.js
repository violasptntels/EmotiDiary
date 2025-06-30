// Import face-api.js library
const faceapi = window.faceapi

const video = document.getElementById("video")
const emotionResult = document.getElementById("emotion-result")
const saveBtn = document.getElementById("save-btn")
const reflectionText = document.getElementById("reflection-text")

let detectedEmotionFace = ""
let currentEmotion = null
let isModelLoaded = false
let stream = null
let detectionInterval = null

// Make currentEmotion globally accessible
window.currentEmotion = null;

// Initialize the application
document.addEventListener("DOMContentLoaded", async function () {
  console.log("DOM loaded, starting initialization...")
  await loadModels()
  await startCamera()
  initializeEventListeners()
})

// Load face-api models
async function loadModels() {
  const emotionResult = document.getElementById("emotion-result")
  emotionResult.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memuat model AI...'

  try {
    // Load models from local directory
    const MODEL_URL = "./models"

    console.log("Loading TinyFaceDetector...")
    await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)

    console.log("Loading FaceExpressionNet...")
    await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)

    isModelLoaded = true
    emotionResult.innerHTML = '<i class="fas fa-check-circle"></i> Model AI siap digunakan'
    console.log("All face-api models loaded successfully")

    // Start detection if video is ready
    const video = document.getElementById("video")
    if (video && video.readyState >= 2) {
      setTimeout(startEmotionDetection, 1000)
    }
  } catch (error) {
    console.error("Error loading models:", error)
    emotionResult.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i> 
            Gagal memuat model AI. Pastikan file model tersedia.
            <br><small>Error: ${error.message}</small>
        `

    // Try fallback - use CDN models
    try {
      console.log("Trying CDN fallback...")
      await faceapi.nets.tinyFaceDetector.loadFromUri("https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights")
      await faceapi.nets.faceExpressionNet.loadFromUri("https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights")

      isModelLoaded = true
      emotionResult.innerHTML = '<i class="fas fa-check-circle"></i> Model AI dimuat dari server'

      const video = document.getElementById("video")
      if (video && video.readyState >= 2) {
        setTimeout(startEmotionDetection, 1000)
      }
    } catch (fallbackError) {
      console.error("CDN fallback failed:", fallbackError)
      emotionResult.innerHTML = '<i class="fas fa-times-circle"></i> Tidak dapat memuat model AI'
    }
  }
}

// Start camera
async function startCamera() {
  const video = document.getElementById("video")
  const emotionResult = document.getElementById("emotion-result")

  try {
    // Request camera permission
    const constraints = {
      video: {
        width: { ideal: 480 },
        height: { ideal: 360 },
        facingMode: "user",
      },
      audio: false,
    }

    console.log("Requesting camera access...")
    stream = await navigator.mediaDevices.getUserMedia(constraints)

    video.srcObject = stream

    // Wait for video to be ready
    video.addEventListener("loadedmetadata", () => {
      console.log("Video metadata loaded, dimensions:", video.videoWidth, "x", video.videoHeight)
    })

    video.addEventListener("loadeddata", () => {
      console.log("Video data loaded")
      if (isModelLoaded) {
        setTimeout(startEmotionDetection, 2000)
      }
    })

    video.addEventListener("canplay", () => {
      console.log("Video can play")
      if (isModelLoaded) {
        setTimeout(startEmotionDetection, 2000)
      }
    })
  } catch (error) {
    console.error("Error accessing camera:", error)

    let errorMessage = ""
    switch (error.name) {
      case "NotAllowedError":
        errorMessage = "Izin kamera ditolak. Mohon izinkan akses kamera dan refresh halaman."
        break
      case "NotFoundError":
        errorMessage = "Kamera tidak ditemukan pada perangkat ini."
        break
      case "NotReadableError":
        errorMessage = "Kamera sedang digunakan aplikasi lain."
        break
      case "OverconstrainedError":
        errorMessage = "Kamera tidak mendukung pengaturan yang diminta."
        break
      default:
        errorMessage = `Error kamera: ${error.message}`
    }

    emotionResult.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${errorMessage}`
  }
}

// Start emotion detection
async function startEmotionDetection() {
  const video = document.getElementById("video")
  const emotionResult = document.getElementById("emotion-result")

  if (!isModelLoaded) {
    console.log("Models not loaded yet")
    return
  }

  if (!video || video.readyState < 2) {
    console.log("Video not ready yet")
    return
  }

  console.log("Starting emotion detection...")
  emotionResult.innerHTML = '<i class="fas fa-search"></i> Mulai mendeteksi emosi...'

  // Clear any existing interval
  if (detectionInterval) {
    clearInterval(detectionInterval)
  }

  // Detect emotions every 1500ms
  detectionInterval = setInterval(async () => {
    if (video.readyState === 4 && video.videoWidth > 0) {
      await detectEmotion(video)
    }
  }, 1500)

  // Run first detection immediately
  setTimeout(() => detectEmotion(video), 500)
}

// Detect emotion from video
async function detectEmotion(video) {
  const emotionResult = document.getElementById("emotion-result")

  try {
    // Configure detection options
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5,
    })

    console.log("Detecting faces...")
    const detections = await faceapi.detectAllFaces(video, options).withFaceExpressions()

    if (detections && detections.length > 0) {
      console.log("Face detected, expressions:", detections[0].expressions)

      const expressions = detections[0].expressions
      const maxExpression = Object.keys(expressions).reduce((a, b) => (expressions[a] > expressions[b] ? a : b))

      const confidence = expressions[maxExpression]
      currentEmotion = maxExpression
      window.currentEmotion = maxExpression; // Update global reference

      // Translate emotions to Indonesian
      const emotionTranslations = {
        happy: { text: "Senang", icon: "😊", color: "var(--success-color)" },
        sad: { text: "Sedih", icon: "😢", color: "var(--primary-color)" },
        angry: { text: "Marah", icon: "😠", color: "var(--error-color)" },
        fearful: { text: "Takut", icon: "😨", color: "var(--warning-color)" },
        disgusted: { text: "Jijik", icon: "🤢", color: "var(--warning-color)" },
        surprised: { text: "Terkejut", icon: "😲", color: "var(--accent-color)" },
        neutral: { text: "Netral", icon: "😐", color: "var(--text-secondary)" },
      }

      const emotion = emotionTranslations[maxExpression] || { text: maxExpression, icon: "😐", color: "var(--text-secondary)" }

      const confidencePercent = (confidence * 100).toFixed(1)

      emotionResult.innerHTML = `
                <i class="fas fa-smile"></i> 
                Emosi Terdeteksi: <strong>${emotion.text} ${emotion.icon}</strong> 
                <small>(${confidencePercent}%)</small>
            `

      // Apply emotion-specific styling
      emotionResult.className = "emotion-detected"
      emotionResult.style.borderColor = emotion.color
      emotionResult.style.backgroundColor = `${emotion.color}20` // 20% opacity

      console.log(`Emotion detected: ${maxExpression} (${confidencePercent}%)`)
    } else {
      emotionResult.innerHTML = '<i class="fas fa-search"></i> Posisikan wajah di depan kamera'
      emotionResult.style.borderColor = "rgba(102, 126, 234, 0.2)"
      emotionResult.style.backgroundColor = "rgba(102, 126, 234, 0.1)"
      emotionResult.className = ""
      currentEmotion = null
      window.currentEmotion = null;
      console.log("No face detected")
    }
  } catch (error) {
    console.error("Error detecting emotion:", error)
    emotionResult.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i> 
            Error deteksi: ${error.message}
        `
  }
}

// Initialize event listeners
function initializeEventListeners() {
  const saveBtn = document.getElementById("save-btn")
  const reflectionText = document.getElementById("reflection-text")

  if (saveBtn) {
    saveBtn.addEventListener("click", function(e) {
      e.preventDefault();
      console.log("Save button clicked via event listener");
      saveReflection();
    });
  }

  if (reflectionText) {
    // Auto-save draft every 30 seconds
    setInterval(() => {
      const text = reflectionText.value.trim()
      if (text) {
        try {
          localStorage.setItem("draft_reflection", text)
          console.log("Draft saved")
        } catch (error) {
          console.error("Error saving draft:", error);
        }
      }
    }, 30000)

    // Load draft on page load
    try {
      const draft = localStorage.getItem("draft_reflection")
      if (draft) {
        reflectionText.value = draft
        console.log("Draft loaded")
      }
    } catch (error) {
      console.error("Error loading draft:", error);
    }
  }
}

// Save reflection with enhanced error handling
function saveReflection() {
  console.log("saveReflection function called");
  
  const saveBtn = document.getElementById("save-btn")
  const reflectionText = document.getElementById("reflection-text")
  
  if (!saveBtn || !reflectionText) {
    console.error("Required elements not found");
    alert("Error: Required form elements not found");
    return;
  }
  
  const text = reflectionText.value.trim()

  if (!text) {
    alert("Mohon tuliskan refleksi Anda terlebih dahulu.")
    reflectionText.focus()
    return
  }

  console.log("Starting save process...");

  // Show loading state
  saveBtn.classList.add("loading")
  saveBtn.disabled = true
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...'

  // Create reflection entry with proper format
  const now = new Date()
  const reflection = {
    id: Date.now(),
    date: now.toISOString().split("T")[0], // YYYY-MM-DD format
    time: now.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' }),
    emotion: currentEmotion,
    emotionTranslated: currentEmotion ? getEmotionTranslation(currentEmotion) : null,
    text: text,
    timestamp: now.toLocaleString("id-ID"),
    wordCount: text.split(/\s+/).filter(word => word.length > 0).length,
    createdAt: now.toISOString()
  }

  console.log("Reflection object created:", reflection);

  try {
    // Test localStorage availability
    if (typeof(Storage) === "undefined") {
      throw new Error("LocalStorage not supported");
    }

    // Save to localStorage
    let reflections = JSON.parse(localStorage.getItem("reflections") || "[]")
    console.log("Existing reflections:", reflections.length);
    
    reflections.unshift(reflection) // Add to beginning of array

    // Keep only last 100 entries
    if (reflections.length > 100) {
      reflections = reflections.slice(0, 100)
    }

    localStorage.setItem("reflections", JSON.stringify(reflections))
    console.log("Reflection saved to localStorage, total count:", reflections.length);

    // Clear draft
    try {
      localStorage.removeItem("draft_reflection")
    } catch (e) {
      console.warn("Could not remove draft:", e);
    }

    // Update global currentEmotion
    window.currentEmotion = currentEmotion;

    // Trigger updates across all pages
    try {
      window.dispatchEvent(new CustomEvent('reflectionSaved', { detail: reflection }))
      window.dispatchEvent(new CustomEvent('dataUpdated', { 
        detail: { 
          source: 'main',
          reflections: reflections,
          newReflection: reflection
        } 
      }))
      console.log("Events dispatched successfully");
    } catch (eventError) {
      console.warn("Error dispatching events:", eventError);
    }

    // Show success message
    setTimeout(() => {
      saveBtn.classList.remove("loading")
      saveBtn.innerHTML = '<i class="fas fa-check"></i> Tersimpan!'
      saveBtn.style.background = "var(--success-color)"

      // Clear form
      reflectionText.value = ""
      currentEmotion = null
      window.currentEmotion = null;

      // Reset emotion display
      const emotionResult = document.getElementById("emotion-result")
      if (emotionResult) {
        emotionResult.innerHTML = '<i class="fas fa-search"></i> Posisikan wajah di depan kamera'
        emotionResult.style.borderColor = "rgba(102, 126, 234, 0.2)"
        emotionResult.style.backgroundColor = "rgba(102, 126, 234, 0.1)"
        emotionResult.className = ""
      }

      // Reset button after 2 seconds
      setTimeout(() => {
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Refleksi'
        saveBtn.style.background = ""
        saveBtn.disabled = false

        // Show enhanced success notification
        const notification = document.createElement("div")
        notification.className = "success-notification"
        notification.innerHTML = `
          <i class="fas fa-check-circle"></i>
          Refleksi berhasil disimpan! Data tersedia di riwayat.
          <button onclick="window.location.href='history.html'" style="margin-left: 1rem; background: rgba(255,255,255,0.2); border: 1px solid white; color: white; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;">
            Lihat Riwayat
          </button>
          <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; font-size: 1.2rem; margin-left: 0.5rem; cursor: pointer;">×</button>
        `
        document.body.appendChild(notification)

        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove()
          }
        }, 8000)

      }, 2000)

    }, 1000)

  } catch (error) {
    console.error("Error saving reflection:", error)
    saveBtn.classList.remove("loading")
    saveBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Gagal menyimpan'
    saveBtn.disabled = false
    
    alert("Gagal menyimpan refleksi: " + error.message + ". Silakan coba lagi.")

    setTimeout(() => {
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Refleksi'
    }, 3000)
  }
}

// Helper function to get emotion translation
function getEmotionTranslation(emotion) {
  const translations = {
    happy: "Senang",
    sad: "Sedih",
    angry: "Marah",
    fearful: "Takut",
    disgusted: "Jijik",
    surprised: "Terkejut",
    neutral: "Netral",
  }
  return translations[emotion] || emotion
}

// Cleanup function
function cleanup() {
  if (detectionInterval) {
    clearInterval(detectionInterval)
  }
  if (stream) {
    stream.getTracks().forEach((track) => {
      track.stop()
      console.log("Camera track stopped")
    })
  }
}

// Handle page unload
window.addEventListener("beforeunload", cleanup)

// Handle visibility change (when tab becomes hidden/visible)
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (detectionInterval) {
      clearInterval(detectionInterval)
      console.log("Detection paused (tab hidden)")
    }
  } else {
    if (isModelLoaded && stream) {
      setTimeout(startEmotionDetection, 1000)
      console.log("Detection resumed (tab visible)")
    }
  }
})
