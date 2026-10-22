// State Management Engine Elements
let currentType = "url";
let qrHistory = JSON.parse(localStorage.getItem("qrHistory")) || [];
let currentQRDataUrl = null;

// DOM Selectors
const tabs = document.querySelectorAll(".tab");
const inputGroups = {
  url: document.getElementById("url-inputs"),
  text: document.getElementById("text-inputs"),
  email: document.getElementById("email-inputs"),
  wifi: document.getElementById("wifi-inputs")
};
const qrForm = document.getElementById("qr-form");
const qrOutput = document.getElementById("qr-output");
const qrPlaceholder = document.getElementById("qr-placeholder");
const qrCodeCanvasWrapper = document.getElementById("qr-code-canvas");
const downloadBtn = document.getElementById("download-btn");
const historyList = document.getElementById("history-list");
const clearHistoryBtn = document.getElementById("clear-history-btn");

// Handle form requirements dynamically on tab swap execution routines
function updateRequiredFields() {
  Object.keys(inputGroups).forEach(type => {
    const group = inputGroups[type];
    const inputs = group.querySelectorAll("input, textarea");
    
    inputs.forEach(input => {
      if (type === currentType) {
        if (input.id !== "email-subject") {
          input.required = true;
        }
      } else {
        input.required = false;
        input.value = ""; 
      }
    });
  });
}

// Tab Switching Activation Channels
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    currentType = tab.dataset.type;

    Object.values(inputGroups).forEach(group => group.classList.add("hidden"));
    inputGroups[currentType].classList.remove("hidden");

    updateRequiredFields();
  });
});

// Primary QR Compilation Handler
qrForm.addEventListener("submit", (e) => {
  e.preventDefault();

  let content = "";

  switch (currentType) {
    case "url":
      content = document.getElementById("url-input").value.trim();
      break;
    case "text":
      content = document.getElementById("text-input").value;
      break;
    case "email":
      const email = document.getElementById("email-input").value.trim();
      const subject = document.getElementById("email-subject").value.trim();
      content = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`;
      break;
    case "wifi":
      const ssid = document.getElementById("wifi-ssid").value.trim();
      const password = document.getElementById("wifi-password").value;
      const encryption = document.getElementById("wifi-encryption").value;
      content = `WIFI:T:${encryption};S:${ssid};P:${password};;`;
      break;
  }

  if (!content) return;

  const size = parseInt(document.getElementById("qr-size").value);
  const color = document.getElementById("qr-color").value;
  const bgColor = document.getElementById("qr-bg-color").value;

  // Clear previous outputs cleanly before processing
  qrCodeCanvasWrapper.innerHTML = "";

  // FALLBACK ENGINE: If the network blocks the library script compile natively
  if (typeof QRCode === "undefined") {
    console.warn("External script library blocked. Using instant browser image API fallback rendering.");
    
    // Generate valid secure API queries mapping targets seamlessly
    const fallbackApiUrl = `https://qrserver.com{size}x${size}&data=${encodeURIComponent(content)}&color=${color.replace("#","")}&bgcolor=${bgColor.replace("#","")}`;
    
    currentQRDataUrl = fallbackApiUrl;
    qrCodeCanvasWrapper.innerHTML = `<img src="${fallbackApiUrl}" alt="Secure QR" style="width:${size}px; height:${size}px;" />`;
    
    qrPlaceholder.classList.add("hidden");
    qrOutput.classList.remove("hidden");
    addToHistory(content, fallbackApiUrl);
    return;
  }

  // STANDARD ENGINE: Executes if jsDelivr loads properly
  try {
    new QRCode(qrCodeCanvasWrapper, {
      text: content,
      width: size,
      height: size,
      colorDark: color,
      colorLight: bgColor,
      correctLevel: 1 // Level Q High efficiency check parameters
    });

    setTimeout(() => {
      const generatedImg = qrCodeCanvasWrapper.querySelector("img");
      const generatedCanvas = qrCodeCanvasWrapper.querySelector("canvas");

      if (generatedImg && generatedImg.src) {
        currentQRDataUrl = generatedImg.src;
      } else if (generatedCanvas) {
        currentQRDataUrl = generatedCanvas.toDataURL("image/png");
      }

      if (currentQRDataUrl) {
        qrPlaceholder.classList.add("hidden");
        qrOutput.classList.remove("hidden");
        addToHistory(content, currentQRDataUrl);
      }
    }, 100);

  } catch (error) {
    console.error("Native matrix compiling failed:", error);
  }
});

// Trigger Local Asset Download Pipeline Action 
downloadBtn.addEventListener("click", async () => {
  if (!currentQRDataUrl) return;

  try {
    const link = document.createElement("a");
    link.download = `qr-code-${Date.now()}.png`;
    
    // Handle fallback network stream conversions safely for downloads
    if (currentQRDataUrl.startsWith("http")) {
      const response = await fetch(currentQRDataUrl);
      const blob = await response.blob();
      link.href = URL.createObjectURL(blob);
    } else {
      link.href = currentQRDataUrl;
    }

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    alert("Could not process down-stream action link file. Try right clicking the image directly.");
  }
});

function addToHistory(content, dataUrl) {
  let displayContent = content;
  if (content.startsWith("mailto:")) {
    displayContent = content.replace("mailto:", "Email: ");
  } else if (content.startsWith("WIFI:")) {
    const ssidMatch = content.match(/S:(.*?);/);
    displayContent = ssidMatch ? `WiFi: ${ssidMatch[1]}` : "WiFi Config";
  }

  if (displayContent.length > 30) {
    displayContent = displayContent.substring(0, 27) + "...";
  }

  const historyItem = { content: displayContent, dataUrl: dataUrl };
  const isDuplicate = qrHistory.some(item => item.content === displayContent);
  if (isDuplicate) return;

  qrHistory.unshift(historyItem);
  if (qrHistory.length > 5) qrHistory.pop();
  
  localStorage.setItem("qrHistory", JSON.stringify(qrHistory));
  renderHistory();
}

clearHistoryBtn.addEventListener("click", () => {
  if (confirm("Clear recent codes profile logs?")) {
    qrHistory = [];
    localStorage.removeItem("qrHistory");
    renderHistory();
  }
});

function renderHistory() {
  historyList.innerHTML = "";
  if (qrHistory.length === 0) {
    historyList.innerHTML = `<p class="no-history">No recent QR codes generated yet.</p>`;
    return;
  }

  qrHistory.forEach((item) => {
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `
      <img src="${item.dataUrl}" alt="History Snap" />
      <p>${escapeHtml(item.content)}</p>
    `;
    div.addEventListener("click", () => {
      currentQRDataUrl = item.dataUrl;
      qrPlaceholder.classList.add("hidden");
      qrOutput.classList.remove("hidden");
      qrCodeCanvasWrapper.innerHTML = `<img src="${item.dataUrl}" alt="Active Target QR" />`;
    });
    historyList.appendChild(div);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

updateRequiredFields();
renderHistory();
