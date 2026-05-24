const slides = [...document.querySelectorAll(".pres-slide")];
const counter = document.getElementById("slideCounter");
const thumbStrip = document.getElementById("thumbStrip");
const progressFill = document.getElementById("progressFill");
const viewport = document.getElementById("viewport");
let current = 0;

function show(index) {
  current = (index + slides.length) % slides.length;
  slides.forEach((s, i) => s.classList.toggle("is-active", i === current));
  if (counter) counter.textContent = `${current + 1} / ${slides.length}`;
  const pct = ((current + 1) / slides.length) * 100;
  if (progressFill) progressFill.style.width = `${pct}%`;
  thumbStrip?.querySelectorAll("button").forEach((b, i) => {
    b.classList.toggle("is-active", i === current);
  });
}

slides.forEach((_, i) => {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = String(i + 1).padStart(2, "0");
  b.title = `Слайд ${i + 1}`;
  b.addEventListener("click", () => show(i));
  thumbStrip?.appendChild(b);
});

document.getElementById("btnPrev")?.addEventListener("click", () => show(current - 1));
document.getElementById("btnNext")?.addEventListener("click", () => show(current + 1));

document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "PageUp") show(current - 1);
  if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
    e.preventDefault();
    show(current + 1);
  }
  if (e.key === "f" || e.key === "F") toggleFullscreen();
});

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    viewport?.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}

document.getElementById("btnFullscreen")?.addEventListener("click", toggleFullscreen);

function exportPdf() {
  document.body.classList.add("print-export");
  const prevTitle = document.title;
  document.title = "Презентация_AES_Задание_3";
  window.print();
  document.title = prevTitle;
}

window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-export");
});

document.getElementById("btnPdf")?.addEventListener("click", exportPdf);

show(0);
