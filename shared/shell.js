/** Боковая навигация и мобильное меню. */

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1v-9.5z"/></svg>',
  entropy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
  aes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 118 0v3"/></svg>',
  deck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
};

const LINKS = [
  { id: "home", href: "index.html", label: "Главная", icon: "home" },
  { id: "entropy", href: "zadanie2-entropy/index.html", label: "Задание 2 · Энтропия", icon: "entropy" },
  { id: "aes", href: "zadanie3-aes/index.html", label: "Задание 3 · AES", icon: "aes" },
  { id: "deck", href: "prezentaciya-aes/index.html", label: "Презентация AES", icon: "deck" },
];

export function initShell({ active, base = "" }) {
  const root = document.getElementById("app-sidebar");
  if (!root) return;

  const nav = LINKS.map((link) => {
    const cls = link.id === active ? "is-active" : "";
    return `<a href="${base}${link.href}" class="${cls}">${ICONS[link.icon]}<span>${link.label}</span></a>`;
  }).join("");

  root.innerHTML = `
    <a href="${base}index.html" class="sidebar-brand">
      <span class="mark">Theor Info</span>
      <div class="title">Теория информации</div>
      <div class="sub">Лабораторные работы</div>
    </a>
    <nav class="sidebar-nav" aria-label="Разделы">${nav}</nav>
    <div class="sidebar-footer">Курс · веб-демо · Python API</div>
  `;

  const toggle = document.getElementById("sidebar-toggle");
  if (toggle) {
    toggle.addEventListener("click", () => root.classList.toggle("is-open"));
    root.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => root.classList.remove("is-open"));
    });
  }
}
