(() => {
  "use strict";

  const PROJECTS = {
    1: {
      kicker: "BRAWN COFFEE",
      title: "Brawn Coffee: Maximalist Pop-Up",
      description:
        "Specialty beverage brand architecture. Includes maximalist visual cafe menus, custom 7 UP 7 dice game pop-up event posters, and distributor unit economics modeling.",
      disciplines: "Brand systems / retail / unit economics",
      mode: "Brand architecture",
      year: "2025",
      category: "01 / BRAND"
    },
    2: {
      kicker: "KHUSHI FOOD PRODUCTS",
      title: "Khushi Food Products: Digital Architecture",
      description:
        "Web architecture and frontend development using HTML, CSS, and Shopify. Includes JSON-LD schema implementation and Gujarati-subtitled video marketing for Alphonso Mango lines.",
      disciplines: "Frontend / Shopify / SEO / content",
      mode: "Digital architecture",
      year: "2025",
      category: "02 / DIGITAL"
    },
    3: {
      kicker: "FINANCIAL MODELING",
      title: "Quantitative Finance & Wealth Management",
      description:
        "Academic modeling covering Delta-Gamma option interactions, retirement planning schedules, and WACC calculations.",
      disciplines: "Valuation / derivatives / planning",
      mode: "Quantitative finance",
      year: "2025",
      category: "03 / FINANCE"
    },
    4: {
      kicker: "CREATIVE DIRECTION & MEDIA",
      title: "Audiovisual Direction",
      description:
        "Cinematic short-form reel direction and live DJ mixing blending electronic and pop tracks using Rekordbox.",
      disciplines: "Direction / editing / DJ performance",
      mode: "Audiovisual",
      year: "2025",
      category: "04 / MEDIA"
    }
  };

  const MIN_DRAG_ANGLE = 7;
  const MAX_DRAG_ANGLE = 87;
  const SNAP_BACK_MS = 660;
  const DEAD_ZONE = 0.035;

  const dial = document.getElementById("rotaryDial");
  const face = dial.querySelector(".rotary__face");
  const dialHub = document.getElementById("dialHub");
  const dialState = document.getElementById("dialState");
  const dialNumber = document.getElementById("dialNumber");

  const modalLayer = document.getElementById("modalLayer");
  const modal = document.getElementById("projectModal");
  const modalClose = document.getElementById("modalClose");
  const modalTitle = document.getElementById("modalTitle");
  const modalKicker = document.getElementById("modalKicker");
  const modalDescription = document.getElementById("modalDescription");
  const modalIndex = document.getElementById("modalIndex");
  const modalCategory = document.getElementById("modalCategory");
  const modalDisciplines = document.getElementById("modalDisciplines");
  const modalMode = document.getElementById("modalMode");
  const modalYear = document.getElementById("modalYear");
  const modalProgress = document.getElementById("modalProgress");

  const state = {
    dragging: false,
    pointerId: null,
    startAngle: 0,
    lastPointerAngle: 0,
    currentAngle: 0,
    lastTimestamp: 0,
    totalClockwiseTravel: 0,
    activeProject: 0,
    locked: false
  };

  function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
  }

  function shortestDelta(from, to) {
    let delta = normalizeAngle(to) - normalizeAngle(from);
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    return delta;
  }

  function getCenter(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }

  function pointerAngle(event) {
    const center = getCenter(dial);
    return Math.atan2(event.clientY - center.y, event.clientX - center.x) * (180 / Math.PI);
  }

  function applyDialAngle(angle, transition = false) {
    const clamped = Math.max(0, Math.min(MAX_DRAG_ANGLE, angle));
    state.currentAngle = clamped;
    dial.style.setProperty("--dial-angle", `${clamped}deg`);

    if (!transition) {
      face.style.transition = "none";
      requestAnimationFrame(() => {
        if (!state.dragging) return;
        face.style.transition = "none";
      });
    } else {
      face.style.transition = `transform ${SNAP_BACK_MS}ms var(--ease-snapback)`;
    }
  }

  function setReadout(projectNumber = 0, label = "READY") {
    dialState.textContent = label;
    dialNumber.textContent = projectNumber ? String(projectNumber).padStart(2, "0") : "00";
  }

  function angleToProject(angle) {
    const segment = (MAX_DRAG_ANGLE - MIN_DRAG_ANGLE) / 4;
    const relative = angle - MIN_DRAG_ANGLE;

    if (relative < 0) return 0;

    const raw = Math.floor(relative / segment) + 1;
    return Math.max(1, Math.min(4, raw));
  }

  function beginDrag(event) {
    if (state.locked) return;
    if (event.button !== undefined && event.button !== 0 && event.pointerType === "mouse") return;

    state.dragging = true;
    state.pointerId = event.pointerId;
    state.startAngle = pointerAngle(event);
    state.lastPointerAngle = state.startAngle;
    state.lastTimestamp = performance.now();
    state.totalClockwiseTravel = 0;

    dial.classList.add("is-dragging");
    dial.setPointerCapture?.(event.pointerId);
    setReadout(0, "TURNING");
    event.preventDefault();
  }

  function moveDrag(event) {
    if (!state.dragging || event.pointerId !== state.pointerId || state.locked) return;

    const now = performance.now();
    const angle = pointerAngle(event);
    const delta = shortestDelta(state.lastPointerAngle, angle);
    const dt = Math.max(now - state.lastTimestamp, 8);

    // Clockwise-only input:
    // Our angular coordinate grows clockwise in screen space after this sign inversion.
    // Any counter-clockwise movement is simply ignored.
    const clockwiseDelta = Math.max(0, delta);

    // Avoid accidental micro-jitter from touchscreens and trackpads.
    const filteredDelta = Math.abs(clockwiseDelta) < DEAD_ZONE ? 0 : clockwiseDelta;

    state.totalClockwiseTravel += filteredDelta;
    state.lastPointerAngle = angle;
    state.lastTimestamp = now;

    const requestedAngle = state.currentAngle + filteredDelta;
    const nextAngle = Math.min(MAX_DRAG_ANGLE, requestedAngle);

    applyDialAngle(nextAngle, false);

    const project = angleToProject(nextAngle);
    const progress = Math.round((nextAngle / MAX_DRAG_ANGLE) * 100);
    dialNumber.textContent = project ? String(project).padStart(2, "0") : "00";
    dialState.textContent = nextAngle >= MAX_DRAG_ANGLE - 0.5
      ? "STOP"
      : `DIAL ${progress}%`;

    // Mechanical stopper: once the max threshold is reached, hold the angle.
    if (nextAngle >= MAX_DRAG_ANGLE - 0.01) {
      state.currentAngle = MAX_DRAG_ANGLE;
      navigator.vibrate?.(18);
    }

    // Use movement timing as a velocity hint for tactile feedback.
    // No ballistic fling is used, because this mechanism deliberately behaves like
    // a rotary phone: travel is hand-controlled, then the dial springs home on release.
    const angularVelocity = filteredDelta / dt;

    if (angularVelocity > 0.5 && nextAngle > MIN_DRAG_ANGLE) {
      dialState.textContent = "FAST";
    }
  }

  function finishDrag(event) {
    if (!state.dragging || event.pointerId !== state.pointerId) return;

    state.dragging = false;
    dial.classList.remove("is-dragging");

    try {
      dial.releasePointerCapture?.(event.pointerId);
    } catch (_) {}

    const completionAngle = state.currentAngle;
    const project = completionAngle >= MIN_DRAG_ANGLE
      ? angleToProject(completionAngle)
      : 0;

    // Return to neutral with a springy cubic-bezier snapback.
    face.style.transition = `transform ${SNAP_BACK_MS}ms var(--ease-snapback)`;
    state.locked = true;
    applyDialAngle(0, true);
    setReadout(project, project ? "RELEASE" : "READY");

    window.setTimeout(() => {
      state.locked = false;
      state.currentAngle = 0;
      setReadout(0, "READY");
    }, SNAP_BACK_MS + 30);

    if (project) {
      window.setTimeout(() => {
        openProject(project);
      }, 150);
    }
  }

  function resetDial() {
    state.dragging = false;
    state.locked = true;
    dial.classList.remove("is-dragging");
    face.style.transition = `transform ${SNAP_BACK_MS}ms var(--ease-snapback)`;
    applyDialAngle(0, true);

    window.setTimeout(() => {
      state.locked = false;
      state.currentAngle = 0;
      setReadout(0, "READY");
    }, SNAP_BACK_MS + 30);
  }

  function openProject(number) {
    const project = PROJECTS[number];
    if (!project) return;

    state.activeProject = number;

    modalKicker.textContent = project.kicker;
    modalTitle.textContent = project.title;
    modalDescription.textContent = project.description;
    modalIndex.textContent = `${String(number).padStart(2, "0")} / 04`;
    modalCategory.textContent = project.category;
    modalDisciplines.textContent = project.disciplines;
    modalMode.textContent = project.mode;
    modalYear.textContent = project.year;
    modalProgress.style.width = `${number * 25}%`;

    modalLayer.classList.add("is-open");
    modalLayer.setAttribute("aria-hidden", "false");

    window.setTimeout(() => {
      modal.focus();
    }, 50);
  }

  function closeProject() {
    modalLayer.classList.remove("is-open");
    modalLayer.setAttribute("aria-hidden", "true");
    state.activeProject = 0;
    window.setTimeout(() => {
      dialHub.focus();
    }, 220);
  }

  dial.addEventListener("pointerdown", beginDrag);
  dial.addEventListener("pointermove", moveDrag);
  dial.addEventListener("pointerup", finishDrag);
  dial.addEventListener("pointercancel", finishDrag);
  dial.addEventListener("lostpointercapture", () => {
    if (!state.dragging) return;
    state.dragging = false;
    dial.classList.remove("is-dragging");
    resetDial();
  });

  dialHub.addEventListener("click", resetDial);
  modalClose.addEventListener("click", closeProject);
  modalLayer.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-modal]")) {
      closeProject();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modalLayer.classList.contains("is-open")) {
      closeProject();
    }
  });

  // Keyboard fallback for accessibility. Keys simulate a completed dial.
  dial.addEventListener("keydown", (event) => {
    const number = Number(event.key);
    if (number >= 1 && number <= 4) {
      event.preventDefault();
      openProject(number);
      resetDial();
    }
  });

  // Keep the face centered and neutral on first paint.
  applyDialAngle(0, false);
  setReadout(0, "READY");
})();
