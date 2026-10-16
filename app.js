// ==========================================
// 1. مفاتيح الاتصال (API Credentials)
// ==========================================
const SUPABASE_URL = "https://obvnjnxptxrfcrkhgwaa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_TeVRjdxQsb8FqepHoDIJ-g_eQfGiaV0";

// 2. تهيئة عميل Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==========================================
// 3. الإمساك بعناصر الواجهة (DOM Elements)
// ==========================================
const authContainer = document.getElementById("auth-container");
const dashboard = document.getElementById("dashboard");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const signupBtn = document.getElementById("signup-btn");
const logoutBtn = document.getElementById("logout-btn");
const notifyBtn = document.getElementById("notify-btn");
const authMessage = document.getElementById("auth-message");

// عناصر الدورة والحقيبة
const cycleForm = document.getElementById("cycle-form");
const startDateInput = document.getElementById("start-date");
const customSymptomInput = document.getElementById("custom-symptom");
const notesInput = document.getElementById("notes");
const customBagInput = document.getElementById("custom-bag-items");
const cycleMessage = document.getElementById("cycle-message");
const historyList = document.getElementById("history-list");

// عناصر بطاقة التنبؤ وتنبيه الحقيبة
const countdownDays = document.getElementById("countdown-days");
const countdownLabel = document.getElementById("countdown-label");
const expectedDateEl = document.getElementById("expected-date");
const emergencyBanner = document.getElementById("emergency-banner");

let currentUser = null;

// ==========================================
// دالة لتنسيق التاريخ: (Year / Day / Month)
// ==========================================
function formatYearDayMonth(dateInput) {
  if (!dateInput) return "";

  if (typeof dateInput === "string" && dateInput.includes("-")) {
    const parts = dateInput.split("-"); // [YYYY, MM, DD]
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];
    return `${year} / ${day} / ${month}`;
  }

  const d = new Date(dateInput);
  const year = d.getFullYear();
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");

  return `${year} / ${day} / ${month}`;
}

// دالة إظهار الرسائل الملونة
function showMessage(element, text, isError = false) {
  element.textContent = text;
  element.style.color = isError ? "#b71c1c" : "#2e7d32";
}

// دالة تحديث حالة الواجهة (تتحكم في إظهار وإخفاء الشاشات)
function updateUI(user) {
  currentUser = user;
  if (user) {
    authContainer.classList.add("hidden");
    dashboard.classList.remove("hidden");
    loadSavedBagItems();
    loadCycles();
    checkNotificationPermissionStatus();
  } else {
    authContainer.classList.remove("hidden");
    dashboard.classList.add("hidden");
    emailInput.value = "";
    passwordInput.value = "";
  }
}

// ==========================================
// 4. نظام تسجيل الدخول (Auth)
// ==========================================
signupBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage(authMessage, "Please enter both email and password.", true);
    return;
  }

  showMessage(authMessage, "Creating account...");
  const { data, error } = await supabaseClient.auth.signUp({ email, password });

  if (error) {
    showMessage(authMessage, error.message, true);
  } else {
    showMessage(authMessage, "Account created! Logging in...");
    if (data.session) updateUI(data.user);
  }
});

loginBtn.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    showMessage(authMessage, "Please enter both email and password.", true);
    return;
  }

  showMessage(authMessage, "Logging in...");
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

  if (error) {
    showMessage(authMessage, error.message, true);
  } else {
    showMessage(authMessage, "Welcome back!");
    updateUI(data.user);
  }
});

logoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  updateUI(null);
  showMessage(authMessage, "You have logged out.");
});

// ==========================================
// 5. إدارة وحفظ حقيبة الطوارئ (Emergency Bag)
// ==========================================
function getSelectedBagItems() {
  const checkedBoxes = document.querySelectorAll('input[name="bag-item"]:checked');
  const items = Array.from(checkedBoxes).map(cb => cb.value);
  const custom = customBagInput ? customBagInput.value.trim() : "";
  if (custom) {
    items.push(custom);
  }
  return items;
}

function saveBagPreferences() {
  const checkedBoxes = document.querySelectorAll('input[name="bag-item"]:checked');
  const checkedValues = Array.from(checkedBoxes).map(cb => cb.value);
  localStorage.setItem("emergency_bag_checked", JSON.stringify(checkedValues));
  localStorage.setItem("emergency_bag_custom", customBagInput.value.trim());

  updateEmergencyBannerText();
}

function loadSavedBagItems() {
  const savedChecked = localStorage.getItem("emergency_bag_checked");
  if (savedChecked) {
    const checkedValues = JSON.parse(savedChecked);
    document.querySelectorAll('input[name="bag-item"]').forEach(cb => {
      cb.checked = checkedValues.includes(cb.value);
    });
  }

  const savedCustom = localStorage.getItem("emergency_bag_custom");
  if (savedCustom && customBagInput) {
    customBagInput.value = savedCustom;
  }
}

function updateEmergencyBannerText() {
  if (emergencyBanner.classList.contains("hidden")) return;

  const items = getSelectedBagItems();
  const itemsListText = items.length > 0 ? items.join(", ") : "your essentials";

  emergencyBanner.innerHTML = `
    👛 <strong>Emergencybag Reminder:</strong> Your Period is very close! 
    <br>Don't forget to pack: <strong style="color: #900c1e;">${itemsListText}</strong>
  `;
}

document.querySelectorAll('input[name="bag-item"]').forEach(cb => {
  cb.addEventListener("change", saveBagPreferences);
});
if (customBagInput) {
  customBagInput.addEventListener("input", saveBagPreferences);
}

// ==========================================
// 6. إشعارات المتصفح (Browser Notification API)
// ==========================================
function checkNotificationPermissionStatus() {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    notifyBtn.textContent = "🔔";
    notifyBtn.title = "Notifications are enabled";
  } else {
    notifyBtn.textContent = "🔕";
    notifyBtn.title = "Click to enable notifications";
  }
}

if (notifyBtn) {
  notifyBtn.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      notifyBtn.textContent = "🔔";
      new Notification("Notifications Enabled! 👛", {
        body: "You will receive reminders when your cycle is close.",
      });
    } else {
      notifyBtn.textContent = "🔕";
      alert("Notification permission was denied.");
    }
  });
}

function triggerEmergencyNotification() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const items = getSelectedBagItems();
  const itemsListText = items.length > 0 ? items.join(", ") : "your essentials";

  new Notification("Emergencybag Reminder 👛", {
    body: `Your period is close! Don't forget to pack: ${itemsListText}`,
  });
}

// ==========================================
// 7. التنبؤ وتنسيق التاريخ المطلوب (Prediction)
// ==========================================
function calculatePrediction(latestCycleDateStr) {
  if (!latestCycleDateStr) {
    countdownDays.textContent = "--";
    countdownLabel.textContent = "Log your first period below";
    expectedDateEl.textContent = "";
    emergencyBanner.classList.add("hidden");
    return;
  }

  const lastDate = new Date(latestCycleDateStr);
  const nextDate = new Date(lastDate);
  nextDate.setDate(lastDate.getDate() + 28);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDate.setHours(0, 0, 0, 0);

  const diffTime = nextDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    countdownDays.textContent = `${diffDays}`;
    countdownLabel.textContent = "Days until next cycle";
  } else if (diffDays === 0) {
    countdownDays.textContent = "Today";
    countdownLabel.textContent = "Cycle expected today 🩸";
  } else {
    countdownDays.textContent = `${Math.abs(diffDays)}`;
    countdownLabel.textContent = "Days late";
  }

  expectedDateEl.textContent = `Expected: ${formatYearDayMonth(nextDate)}`;

  if (diffDays <= 5 && diffDays >= 0) {
    emergencyBanner.classList.remove("hidden");
    updateEmergencyBannerText();
    triggerEmergencyNotification();
  } else {
    emergencyBanner.classList.add("hidden");
  }
}

// ==========================================
// 8. حفظ وجلب السجلات (History & Delete)
// ==========================================
cycleForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const startDate = startDateInput.value;
  const notes = notesInput.value.trim();
  const customSymptom = customSymptomInput.value.trim();

  const checkedBoxes = document.querySelectorAll('input[name="symptom"]:checked');
  let selectedSymptoms = Array.from(checkedBoxes).map((box) => box.value);

  if (customSymptom) {
    selectedSymptoms.push(customSymptom);
  }

  if (!startDate) {
    showMessage(cycleMessage, "Please pick a start date.", true);
    return;
  }

  showMessage(cycleMessage, "Saving your entry...");

  const { error } = await supabaseClient.from("cycles").insert([
    {
      user_id: currentUser.id,
      start_date: startDate,
      symptoms: selectedSymptoms,
      notes: notes || null,
    },
  ]);

  if (error) {
    showMessage(cycleMessage, "Error: " + error.message, true);
  } else {
    showMessage(cycleMessage, "Entry saved successfully! 🌙");
    cycleForm.reset();
    customSymptomInput.value = "";
    loadSavedBagItems();
    loadCycles();
  }
});

async function loadCycles() {
  historyList.innerHTML = "<li class='empty-state'>Loading entries...</li>";

  const { data: cycles, error } = await supabaseClient
    .from("cycles")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) {
    historyList.innerHTML = `<li class='empty-state' style='color:#b71c1c'>Failed to load entries.</li>`;
    return;
  }

  if (!cycles || cycles.length === 0) {
    historyList.innerHTML = "<li class='empty-state'>No previous cycles recorded yet.</li>";
    calculatePrediction(null);
    return;
  }

  calculatePrediction(cycles[0].start_date);

  historyList.innerHTML = "";

  cycles.forEach((cycle) => {
    const li = document.createElement("li");
    li.className = "history-item";

    const symptomsText =
      cycle.symptoms && cycle.symptoms.length > 0
        ? `• Feeling: ${cycle.symptoms.join(", ")}`
        : "";

    const notesText = cycle.notes
      ? `<br><small style="color:#777">"${cycle.notes}"</small>`
      : "";

    const formattedDate = formatYearDayMonth(cycle.start_date);

    li.innerHTML = `
      <div class="history-item-content">
        <div class="date">🩸 Started: ${formattedDate}</div>
        ${symptomsText ? `<div style="margin-top:4px; color:#555;">${symptomsText}</div>` : ""}
        ${notesText}
      </div>
      <button class="delete-cycle-btn" onclick="deleteCycleEntry(${cycle.id})">Delete ✕</button>
    `;

    historyList.appendChild(li);
  });
}

window.deleteCycleEntry = async function (cycleId) {
  const confirmDelete = confirm("Are you sure you want to delete this period entry?");
  if (!confirmDelete) return;

  const { error } = await supabaseClient
    .from("cycles")
    .delete()
    .eq("id", cycleId);

  if (error) {
    alert("Could not delete entry: " + error.message);
  } else {
    loadCycles();
  }
};

// ==========================================
// 9. تفعيل التقويم الأنيق Flatpickr
// ==========================================
flatpickr("#start-date", {
  dateFormat: "Y-m-d",
  altInput: true,
  altFormat: "Y / d / m",
  maxDate: "today",
  disableMobile: "true"
});

// ==========================================
// 10. فحص الجلسة الذكي (Fix: يظهر صفحة الدخول للزوار الجدد)
// ==========================================
async function checkCurrentSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    updateUI(session.user);
  } else {
    updateUI(null); // يضمن ظهور صفحة الدخول تلقائياً
  }
}

// الاستماع لأي تغيير في حالة الحساب (تسجيل دخول أو خروج)
supabaseClient.auth.onAuthStateChange((event, session) => {
  if (session) {
    updateUI(session.user);
  } else {
    updateUI(null);
  }
});

checkCurrentSession();