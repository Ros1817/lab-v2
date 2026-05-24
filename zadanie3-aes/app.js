import { apiGet, apiPost } from "../shared/api.js";

const $ = (id) => document.getElementById(id);

let keyBits = 256;

function log(el, msg, isError = false) {
  if (!el) return;
  el.textContent = msg;
  el.className = isError ? "log-strip error" : "log-strip ok";
}

function bindKeyPills(container, onChange) {
  container?.querySelectorAll("button[data-bits]").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      keyBits = Number(btn.dataset.bits);
      onChange?.(keyBits);
    });
  });
}

function getActivePassphrase() {
  const encPane = $("pane-encrypt");
  if (encPane?.classList.contains("is-active")) return $("passphraseEnc").value;
  return $("passphraseDec").value;
}

function updatePacketList(listEl, rows) {
  if (!listEl) return;
  listEl.innerHTML = rows
    .map(([k, v]) => `<li><span>${k}</span><span>${v}</span></li>`)
    .join("");
}

async function animatePipeline(pipeEl, steps, delay = 280) {
  if (!pipeEl) return;
  const nodes = [...pipeEl.querySelectorAll(".pipeline-node")];
  nodes.forEach((n) => n.classList.remove("live"));
  for (const step of steps) {
    const node = pipeEl.querySelector(`[data-step="${step}"]`);
    node?.classList.add("live");
    await new Promise((r) => setTimeout(r, delay));
  }
}

async function withLoading(fn) {
  document.body.classList.add("loading");
  try {
    await fn();
  } finally {
    document.body.classList.remove("loading");
  }
}

/* Tabs */
document.querySelectorAll(".aes-tabs button[data-tab]").forEach((tab) => {
  tab.addEventListener("click", () => {
    const id = tab.dataset.tab;
    document.querySelectorAll(".aes-tabs button").forEach((t) => {
      t.classList.toggle("is-active", t === tab);
      t.setAttribute("aria-selected", t === tab ? "true" : "false");
    });
    document.querySelectorAll(".aes-pane").forEach((p) => {
      const active = p.id === `pane-${id}`;
      p.classList.toggle("is-active", active);
      p.hidden = !active;
    });
  });
});

bindKeyPills($("keyPillsEnc"));
bindKeyPills($("keyPillsDec"));

$("btnTogglePass")?.addEventListener("click", () => {
  const inp = $("passphraseEnc");
  inp.type = inp.type === "password" ? "text" : "password";
});

$("btnRandomIv")?.addEventListener("click", () =>
  withLoading(async () => {
    try {
      const data = await apiGet("/api/aes/random-iv");
      $("ivHexEnc").value = data.ivHex;
      log($("logEnc"), `IV: ${data.ivHex}`);
    } catch (e) {
      log($("logEnc"), e.message, true);
    }
  })
);

$("btnSample")?.addEventListener("click", () => {
  $("plaintext").value =
    "Лабораторная работа: симметричное шифрование AES-CBC для передачи конфиденциальных данных по открытому каналу.";
  $("passphraseEnc").value = "theor-info-2026";
  $("passphraseDec").value = "theor-info-2026";
  $("ivHexEnc").value = "";
  document.querySelectorAll(".key-pills button[data-bits='256']").forEach((b) => {
    b.click();
  });
  log($("logEnc"), "Загружен демонстрационный пример.");
});

async function runEncrypt() {
  await withLoading(async () => {
    const logEl = $("logEnc");
    try {
      await animatePipeline($("pipelineEnc"), ["plain", "pad", "aes", "pack"]);
      const result = await apiPost("/api/aes/encrypt", {
        plaintext: $("plaintext").value,
        passphrase: $("passphraseEnc").value,
        key_bits: keyBits,
        iv_hex: $("ivHexEnc").value.trim(),
      });
      $("ciphertextEnc").value = result.ciphertext;
      if (result.ivHex) $("ivHexEnc").value = result.ivHex;

      const ct = result.ciphertext;
      updatePacketList($("packetEnc"), [
        ["Режим", `AES-${result.keyBits}-${result.mode}`],
        ["Ключ", `${keyBits} бит`],
        ["IV (hex)", result.ivHex || "—"],
        ["Размер пакета", `${ct.length} симв. B64`],
      ]);
      $("packetIvEnc").textContent = `Первые байты пакета после decode: IV (16 B) + шифротекст.\nIV: ${result.ivHex}`;

      log(logEl, "Пакет сформирован. Можно копировать или расшифровать.");
    } catch (e) {
      log(logEl, e.message, true);
    }
  });
}

$("btnEncrypt")?.addEventListener("click", runEncrypt);
$("btnCopyCt")?.addEventListener("click", async () => {
  const t = $("ciphertextEnc").value;
  if (!t) {
    log($("logEnc"), "Нечего копировать.", true);
    return;
  }
  await navigator.clipboard.writeText(t);
  log($("logEnc"), "Пакет скопирован в буфер обмена.");
});

$("btnToDecrypt")?.addEventListener("click", () => {
  $("ciphertextDec").value = $("ciphertextEnc").value;
  $("passphraseDec").value = $("passphraseEnc").value;
  document.querySelector('.aes-tabs button[data-tab="decrypt"]').click();
});

async function runDecrypt(wrongKey = false) {
  await withLoading(async () => {
    const logEl = $("logDec");
    const pass = wrongKey ? `${$("passphraseDec").value}_wrong` : $("passphraseDec").value;
    try {
      await animatePipeline($("pipelineDec"), ["pack", "aes", "pad", "plain"]);
      const result = await apiPost("/api/aes/decrypt", {
        ciphertext: $("ciphertextDec").value,
        passphrase: pass,
        key_bits: keyBits,
      });
      $("decryptOut").value = result.plaintext;
      updatePacketList($("packetDec"), [
        ["Режим", `AES-${result.keyBits}-${result.mode}`],
        ["IV из пакета", result.ivHex || "—"],
        ["Статус", wrongKey ? "неожиданный успех" : "OK"],
      ]);
      log(logEl, wrongKey ? "Ошибка не возникла (аномалия)." : "Текст восстановлен.");
    } catch (e) {
      $("decryptOut").value = "";
      updatePacketList($("packetDec"), [
        ["Режим", "—"],
        ["IV из пакета", "—"],
        ["Статус", "ошибка"],
      ]);
      log(logEl, wrongKey ? "Ожидаемо: неверный ключ." : e.message, !wrongKey);
    }
  });
}

$("btnDecrypt")?.addEventListener("click", () => runDecrypt(false));
$("btnDecryptPrimary")?.addEventListener("click", () => runDecrypt(false));
$("btnWrongKey")?.addEventListener("click", () => {
  if (!$("ciphertextDec").value.trim()) {
    log($("logDec"), "Вставьте пакет Base64.", true);
    return;
  }
  runDecrypt(true);
});
