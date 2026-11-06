
// =====================================
// MYSTUDY INTERACTIVE EDITION
// =====================================

const $ = (id) => document.getElementById(id);
const KEY = "mystudy_interactive_v2";

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const defaultData = {
  profile: "Student",
  tasks: [],
  agendas: [],
  notes: [],
  xp: 0,
  focusMinutes: 0,
  sessions: 0,
  activity: {},
  timerMode: "Focus"
};

let data;
try {
  data = { ...defaultData, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
} catch {
  data = { ...defaultData };
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(data));
  updateDashboard();
  updateAnalytics();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast.timeout);
  toast.timeout = setTimeout(() => el.classList.remove("show"), 2400);
}

function markActivity(date = today()) {
  data.activity[date] = (data.activity[date] || 0) + 1;
}

function getStreak() {
  let streak = 0;
  const d = new Date();
  if (!data.activity[today()]) d.setDate(d.getDate() - 1);

  while (data.activity[
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
  ]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function getLevel() {
  return Math.floor(data.xp / 100) + 1;
}

function getLevelProgress() {
  return data.xp % 100;
}

// =====================================
// NAVIGATION
// =====================================

const pageTitles = {
  dashboard: "Dashboard",
  calendar: "Calendar",
  timer: "Focus Timer",
  tasks: "My Tasks",
  notes: "My Notes",
  analytics: "Analytics",
  settings: "Settings"
};

function showPage(page) {
  document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".nav-link").forEach(el => el.classList.remove("active"));

  $(page)?.classList.add("active");
  document.querySelector(`[data-page="${page}"]`)?.classList.add("active");
  $("pageTitle").textContent = pageTitles[page] || "MyStudy";

  if (page === "calendar") renderCalendar();
  if (page === "tasks") renderTasks();
  if (page === "notes") renderNotes();
  if (page === "analytics") updateAnalytics();
}

document.querySelectorAll("[data-page]").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(btn => {
  btn.addEventListener("click", () => showPage(btn.dataset.go));
});

// =====================================
// CLOCK & PROFILE
// =====================================

function updateClock() {
  const now = new Date();
  $("clock").textContent = now.toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  $("todayText").textContent = now.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).toUpperCase();
}

setInterval(updateClock, 1000);
updateClock();

function updateProfile() {
  const name = data.profile || "Student";
  $("sideName").textContent = name;
  $("topAvatar").textContent = name.charAt(0).toUpperCase();
  document.querySelector(".mini-profile .avatar").textContent = name.charAt(0).toUpperCase();
  $("nameInput").value = name;
}

$("saveName").addEventListener("click", () => {
  const name = $("nameInput").value.trim();
  if (!name) return toast("Nama tidak boleh kosong.");
  data.profile = name;
  save();
  updateProfile();
  toast("Profil berhasil disimpan!");
});

// =====================================
// TASKS
// =====================================

function addTask() {
  const title = prompt("Masukkan nama tugas:");
  if (!title || !title.trim()) return;

  const due = prompt("Deadline (YYYY-MM-DD), kosongkan jika tidak ada:", today());
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    return toast("Format tanggal harus YYYY-MM-DD.");
  }

  data.tasks.unshift({
    id: Date.now(),
    title: title.trim(),
    due: due || "",
    done: false
  });

  save();
  renderTasks();
  toast("Tugas berhasil ditambahkan!");
}

$("addTask").addEventListener("click", addTask);

function taskMarkup(task) {
  return `
    <div class="task-row ${task.done ? "completed" : ""}" data-task="${task.id}">
      <input type="checkbox" class="task-check" data-id="${task.id}" ${task.done ? "checked" : ""}>
      <div class="task-main">
        <strong>${escapeHTML(task.title)}</strong>
        <small>${task.due ? "Deadline: " + escapeHTML(task.due) : "Tanpa deadline"}</small>
      </div>
      <div class="row-actions">
        <button class="icon-btn" data-edit-task="${task.id}" title="Edit">✎</button>
        <button class="icon-btn" data-delete-task="${task.id}" title="Hapus">×</button>
      </div>
    </div>`;
}

function renderTasks(filter = "all") {
  const list = data.tasks.filter(task => {
    if (filter === "active") return !task.done;
    if (filter === "done") return task.done;
    return true;
  });

  $("allTasks").innerHTML = list.length
    ? list.map(taskMarkup).join("")
    : `<div class="empty-state">Belum ada tugas di sini. Tambahkan tugas pertamamu ✦</div>`;

  const upcoming = data.tasks.filter(t => !t.done).slice(0, 4);
  $("dashboardTasks").innerHTML = upcoming.length
    ? upcoming.map(taskMarkup).join("")
    : `<div class="empty-state">Tidak ada tugas yang tertunda. Hebat!</div>`;
}

document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderTasks(btn.dataset.filter);
  });
});

document.addEventListener("change", event => {
  if (!event.target.matches(".task-check")) return;

  const task = data.tasks.find(t => t.id === Number(event.target.dataset.id));
  if (!task) return;

  if (task.done !== event.target.checked) {
    task.done = event.target.checked;
    if (task.done) {
      data.xp += 10;
      markActivity();
      toast("+10 XP! Tugas berhasil diselesaikan.");
    } else {
      data.xp = Math.max(0, data.xp - 10);
      toast("Status tugas diperbarui.");
    }
  }

  save();
  renderTasks(document.querySelector(".filter-btn.active")?.dataset.filter || "all");
});

document.addEventListener("click", event => {
  const editTask = event.target.closest("[data-edit-task]");
  const deleteTask = event.target.closest("[data-delete-task]");

  if (editTask) {
    const task = data.tasks.find(t => t.id === Number(editTask.dataset.editTask));
    if (!task) return;
    const title = prompt("Ubah nama tugas:", task.title);
    if (title === null || !title.trim()) return;
    const due = prompt("Deadline (YYYY-MM-DD), kosongkan jika tidak ada:", task.due);
    if (due === null) return;
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return toast("Format tanggal salah.");
    task.title = title.trim();
    task.due = due;
    save();
    renderTasks();
    toast("Tugas diperbarui.");
  }

  if (deleteTask) {
    if (!confirm("Yakin ingin menghapus tugas ini?")) return;
    data.tasks = data.tasks.filter(t => t.id !== Number(deleteTask.dataset.deleteTask));
    save();
    renderTasks();
    toast("Tugas dihapus.");
  }
});

$("dashboardTasks").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit-task]");
  const del = event.target.closest("[data-delete-task]");
  if (edit || del) {
    // Tombol tugas di dashboard menggunakan handler dokumen yang sama.
    return;
  }
});

// =====================================
// CALENDAR & AGENDAS
// =====================================

let calendarDate = new Date();
let selectedDate = today();

function dateKey(year, month, day) {
  return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

function renderCalendar() {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  $("monthLabel").textContent = calendarDate.toLocaleDateString("id-ID", {
    month: "long", year: "numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousDays = new Date(year, month, 0).getDate();
  let html = "";

  for (let i = 0; i < 42; i++) {
    let day, date, outside = false;

    if (i < firstDay) {
      day = previousDays - firstDay + i + 1;
      date = dateKey(year, month - 1, day);
      outside = true;
    } else if (i >= firstDay + daysInMonth) {
      day = i - firstDay - daysInMonth + 1;
      date = dateKey(year, month + 1, day);
      outside = true;
    } else {
      day = i - firstDay + 1;
      date = dateKey(year, month, day);
    }

    const hasAgenda = data.agendas.some(a => a.date === date);
    html += `
      <button class="day ${outside ? "muted-day" : ""} ${date === today() ? "today" : ""} ${date === selectedDate ? "selected" : ""}" data-date="${date}">
        <span class="day-number">${day}</span>
        ${hasAgenda ? '<span class="day-dot"></span>' : ""}
      </button>`;
  }

  $("calendarDays").innerHTML = html;
  renderAgenda();
}

function renderAgenda() {
  const date = new Date(selectedDate + "T00:00:00");
  $("selectedDateLabel").textContent = date.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long"
  });

  const agendas = data.agendas.filter(a => a.date === selectedDate);
  $("agendaList").innerHTML = agendas.length
    ? agendas.map(a => `
      <div class="task-row">
        <div class="task-main">
          <strong>${escapeHTML(a.title)}</strong>
          <small>Agenda belajar</small>
        </div>
        <div class="row-actions">
          <button class="icon-btn" data-edit-agenda="${a.id}">✎</button>
          <button class="icon-btn" data-delete-agenda="${a.id}">×</button>
        </div>
      </div>`).join("")
    : `<div class="empty-state">Belum ada agenda pada tanggal ini.</div>`;
}

$("calendarDays").addEventListener("click", event => {
  const day = event.target.closest("[data-date]");
  if (!day) return;
  selectedDate = day.dataset.date;
  const d = new Date(selectedDate + "T00:00:00");
  calendarDate = new Date(d.getFullYear(), d.getMonth(), 1);
  renderCalendar();
});

$("prevMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  renderCalendar();
});

$("nextMonth").addEventListener("click", () => {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  renderCalendar();
});

$("todayBtn").addEventListener("click", () => {
  calendarDate = new Date();
  selectedDate = today();
  renderCalendar();
});

function addAgenda() {
  const title = prompt("Nama agenda:");
  if (!title || !title.trim()) return;

  data.agendas.push({
    id: Date.now(),
    title: title.trim(),
    date: selectedDate
  });

  save();
  renderCalendar();
  toast("Agenda berhasil ditambahkan!");
}

$("addAgenda").addEventListener("click", addAgenda);

$("agendaList").addEventListener("click", event => {
  const edit = event.target.closest("[data-edit-agenda]");
  const del = event.target.closest("[data-delete-agenda]");

  if (edit) {
    const item = data.agendas.find(a => a.id === Number(edit.dataset.editAgenda));
    if (!item) return;
    const title = prompt("Ubah agenda:", item.title);
    if (title === null || !title.trim()) return;
    item.title = title.trim();
    save();
    renderCalendar();
  }

  if (del) {
    if (!confirm("Hapus agenda ini?")) return;
    data.agendas = data.agendas.filter(a => a.id !== Number(del.dataset.deleteAgenda));
    save();
    renderCalendar();
    toast("Agenda dihapus.");
  }
});

// =====================================
// FOCUS TIMER
// =====================================

let timerDuration = 25 * 60;
let timerRemaining = timerDuration;
let timerInterval = null;
let timerRunning = false;
let currentMode = "Focus";

function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = timerRemaining % 60;
  $("timerDisplay").textContent =
    `${String(minutes).padStart(2,"0")}:${String(seconds).padStart(2,"0")}`;

  $("timerMode").textContent = currentMode.toUpperCase() + " TIME";

  const progress = timerDuration ? (timerDuration - timerRemaining) / timerDuration : 0;
  $("timerRing").style.background =
    `conic-gradient(var(--purple) ${progress * 360}deg, var(--lavender) 0deg)`;
}

function selectTimerMode(mode, minutes) {
  clearInterval(timerInterval);
  timerRunning = false;
  currentMode = mode;
  timerDuration = minutes * 60;
  timerRemaining = timerDuration;
  $("timerStart").textContent = "▶ Start";

  document.querySelectorAll(".timer-mode").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });

  updateTimerDisplay();
}

document.querySelectorAll(".timer-mode").forEach(btn => {
  btn.addEventListener("click", () => {
    selectTimerMode(btn.dataset.mode, Number(btn.dataset.minutes));
  });
});

function finishTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
  $("timerStart").textContent = "▶ Start";

  if (currentMode === "Focus") {
    data.focusMinutes += 25;
    data.sessions += 1;
    data.xp += 15;
    markActivity();
    save();
    toast("Sesi fokus selesai! +15 XP ✦");
  } else {
    toast("Waktu istirahat selesai!");
  }
  timerRemaining = 0;
  updateTimerDisplay();
  $("timerHint").textContent = "Session completed!";
}

$("timerStart").addEventListener("click", () => {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
    $("timerStart").textContent = "▶ Lanjutkan";
    return;
  }

  if (timerRemaining <= 0) timerRemaining = timerDuration;
  timerRunning = true;
  $("timerStart").textContent = "Ⅱ Pause";
  $("timerHint").textContent = "Stay focused!";

  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();
    if (timerRemaining <= 0) finishTimer();
  }, 1000);
});

$("timerReset").addEventListener("click", () => {
  clearInterval(timerInterval);
  timerRunning = false;
  timerRemaining = timerDuration;
  $("timerStart").textContent = "▶ Start";
  $("timerHint").textContent = "You can do it!";
  updateTimerDisplay();
});

updateTimerDisplay();

// =====================================
// ADVANCED NOTES
// =====================================

function renderNotes() {
  const search = $("noteSearch").value.toLowerCase();
  const notes = data.notes.filter(note =>
    (note.title + " " + note.content).toLowerCase().includes(search)
  ).sort((a, b) => Number(b.pinned) - Number(a.pinned));

  $("notesGrid").innerHTML = notes.length
    ? notes.map(note => `
      <article class="note-card note-${note.color}">
        <div class="note-actions">
          <button class="icon-btn" data-pin-note="${note.id}" title="Pin">${note.pinned ? "★" : "☆"}</button>
          <button class="icon-btn" data-edit-note="${note.id}" title="Edit">✎</button>
          <button class="icon-btn" data-delete-note="${note.id}" title="Hapus">×</button>
        </div>
        <h3>${escapeHTML(note.title)}</h3>
        <p>${escapeHTML(note.content)}</p>
        <small>${escapeHTML(note.date)}</small>
      </article>`).join("")
    : `<div class="empty-state">Tidak ada catatan ditemukan. Buat catatan pertamamu ✦</div>`;
}

function addNote() {
  const title = prompt("Judul catatan:");
  if (!title || !title.trim()) return;

  const content = prompt("Isi catatan:");
  if (content === null) return;

  const color = prompt("Warna catatan: yellow / purple / pink / green", "yellow");
  const allowed = ["yellow", "purple", "pink", "green"];

  data.notes.unshift({
    id: Date.now(),
    title: title.trim(),
    content: content,
    color: allowed.includes(color) ? color : "yellow",
    pinned: false,
    date: today()
  });

  save();
  renderNotes();
  toast("Catatan berhasil disimpan!");
}

$("addNote").addEventListener("click", addNote);
$("noteSearch").addEventListener("input", renderNotes);

$("notesGrid").addEventListener("click", event => {
  const pin = event.target.closest("[data-pin-note]");
  const edit = event.target.closest("[data-edit-note]");
  const del = event.target.closest("[data-delete-note]");

  if (pin) {
    const note = data.notes.find(n => n.id === Number(pin.dataset.pinNote));
    if (!note) return;
    note.pinned = !note.pinned;
    save();
    renderNotes();
    toast(note.pinned ? "Catatan disematkan." : "Pin catatan dilepas.");
  }

  if (edit) {
    const note = data.notes.find(n => n.id === Number(edit.dataset.editNote));
    if (!note) return;

    const title = prompt("Judul catatan:", note.title);
    if (title === null || !title.trim()) return;
    const content = prompt("Isi catatan:", note.content);
    if (content === null) return;

    note.title = title.trim();
    note.content = content;
    note.date = today();
    save();
    renderNotes();
    toast("Catatan diperbarui.");
  }

  if (del) {
    if (!confirm("Hapus catatan ini?")) return;
    data.notes = data.notes.filter(n => n.id !== Number(del.dataset.deleteNote));
    save();
    renderNotes();
    toast("Catatan dihapus.");
  }
});

// =====================================
// DASHBOARD & GAMIFICATION
// =====================================

function updateDashboard() {
  const completed = data.tasks.filter(t => t.done).length;
  const level = getLevel();
  const progress = getLevelProgress();

  $("doneStat").textContent = completed;
  $("focusStat").innerHTML = `${data.focusMinutes} <small>menit</small>`;
  $("xpStat").textContent = `${data.xp} XP`;
  $("levelStat").textContent = `Level ${level}`;
  $("streakStat").textContent = `${getStreak()} hari`;

  $("levelBadge").textContent = `Lv. ${level}`;
  $("levelPercent").textContent = `${progress}%`;
  $("xpBar").style.width = `${progress}%`;
  $("xpDetail").textContent = `${progress} / 100 XP`;
  $("xpMessage").textContent = progress >= 80
    ? "Sedikit lagi naik level!"
    : "Terus kumpulkan XP!";
  $("levelCircle").style.background =
    `conic-gradient(var(--purple) ${progress * 3.6}deg, var(--lavender) 0deg)`;

  $("timerTotal").textContent = `${data.focusMinutes} menit`;
  $("sessionTotal").textContent = data.sessions;

  renderTasks();
}

function updateAnalytics() {
  const completed = data.tasks.filter(t => t.done).length;

  $("analyticsDone").textContent = completed;
  $("analyticsFocus").textContent = `${data.focusMinutes} mnt`;
  $("analyticsXP").textContent = data.xp;
  $("analyticsStreak").textContent = `${getStreak()} hari`;
  $("analyticsAgenda").textContent = data.agendas.length;
  $("analyticsNotes").textContent = data.notes.length;
  $("analyticsPending").textContent = data.tasks.filter(t => !t.done).length;

  const labels = [];
  const values = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
    labels.push(d.toLocaleDateString("id-ID", { weekday: "short" }));
    values.push(data.activity[key] || 0);
  }

  const max = Math.max(1, ...values);
  $("weeklyChart").innerHTML = labels.map((label, i) => `
    <div class="chart-column">
      <div class="chart-bar-wrap">
        <div class="chart-bar" style="height:${Math.max(4, values[i] / max * 100)}%"></div>
      </div>
      <strong>${values[i]}</strong>
      <small>${label}</small>
    </div>`).join("");
}

// =====================================
// BACKUP & RESTORE
// =====================================

$("exportData").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "mystudy-backup.json";
  link.click();
  URL.revokeObjectURL(url);
  toast("Backup berhasil dibuat!");
});

$("importData").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported || !Array.isArray(imported.tasks) ||
          !Array.isArray(imported.agendas) || !Array.isArray(imported.notes)) {
        throw new Error("Format backup tidak sesuai.");
      }

      data = { ...defaultData, ...imported };
      save();
      updateProfile();
      renderCalendar();
      renderNotes();
      renderTasks();
      toast("Backup berhasil dipulihkan!");
    } catch {
      toast("File backup tidak valid.");
    }
    event.target.value = "";
  };
  reader.readAsText(file);
});

$("resetData").addEventListener("click", () => {
  if (!confirm("Semua tugas, agenda, catatan, dan XP akan dihapus. Lanjutkan?")) return;

  clearInterval(timerInterval);
  data = { ...defaultData };
  save();
  updateProfile();
  renderCalendar();
  renderNotes();
  renderTasks();
  selectTimerMode("Focus", 25);
  toast("Data MyStudy telah direset.");
});

// =====================================
// INITIAL LOAD
// =====================================

updateProfile();
updateDashboard();
updateAnalytics();
renderCalendar();
renderNotes();
renderTasks();
