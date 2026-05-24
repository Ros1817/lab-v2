import { apiPost, showStatus } from "../shared/api.js";

const $ = (id) => document.getElementById(id);

const SAMPLES = {
  indep: {
    labelsX: "x1, x2, x3",
    labelsY: "y1, y2",
    matrix: [
      [0.1, 0.1],
      [0.2, 0.2],
      [0.15, 0.15],
    ],
  },
  dep: {
    labelsX: "A, B",
    labelsY: "0, 1",
    matrix: [
      [0.45, 0.05],
      [0.05, 0.45],
    ],
  },
  diag: {
    labelsX: "s1, s2",
    labelsY: "t1, t2",
    matrix: [
      [0.5, 0],
      [0, 0.5],
    ],
  },
};

let tableRows = 3;
let tableCols = 2;

function parseLabels(raw) {
  return raw
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function matrixToText(matrix) {
  return matrix.map((row) => row.join(" ")).join("\n");
}

function textToMatrix(text) {
  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.map((line) =>
    line.split(/[\s,;]+/).map((v) => parseFloat(v.replace(",", ".")))
  );
}

function readTable() {
  const inputs = $("matrixWrap").querySelectorAll("input[data-cell]");
  const matrix = [];
  for (let i = 0; i < tableRows; i++) {
    const row = [];
    for (let j = 0; j < tableCols; j++) {
      const el = inputs[i * tableCols + j];
      row.push(parseFloat(el.value) || 0);
    }
    matrix.push(row);
  }
  return matrix;
}

function renderTable(matrix) {
  tableRows = matrix.length;
  tableCols = matrix[0]?.length || 2;
  const lx = parseLabels($("labelsX").value);
  const ly = parseLabels($("labelsY").value);

  let html = '<table class="matrix-table"><thead><tr><th></th>';
  for (let j = 0; j < tableCols; j++) {
    html += `<th>${ly[j] || `y${j + 1}`}</th>`;
  }
  html += "</tr></thead><tbody>";

  for (let i = 0; i < tableRows; i++) {
    html += `<tr><th>${lx[i] || `x${i + 1}`}</th>`;
    for (let j = 0; j < tableCols; j++) {
      const v = matrix[i]?.[j] ?? 0;
      html += `<td><input type="text" data-cell value="${v}" inputmode="decimal" /></td>`;
    }
    html += "</tr>";
  }
  html += "</tbody></table>";
  $("matrixWrap").innerHTML = html;
}

function setKpi(ent) {
  const map = [
    ["H(X)", ent.H_X],
    ["H(Y)", ent.H_Y],
    ["H(X,Y)", ent.H_XY],
    ["H(X|Y)", ent.H_X_given_Y],
    ["H(Y|X)", ent.H_Y_given_X],
    ["I(X;Y)", ent.I_XY],
  ];
  const nodes = $("kpiFull").querySelectorAll(".kpi");
  map.forEach(([label, val], i) => {
    nodes[i].querySelector(".kpi-label").textContent = label;
    nodes[i].querySelector(".kpi-value").textContent = val.toFixed(4);
  });
}

function renderPartial(listEl, items, kind) {
  if (!items.length) {
    listEl.innerHTML = "<li>Нет данных</li>";
    return;
  }
  listEl.innerHTML = items
    .map((item) => {
      const given = item.given;
      const h = item.h;
      const pCond = kind === "x" ? item.pY : item.pX;
      const dist = (item.distribution || [])
        .map((d) => `${d.label}: ${d.p}`)
        .join(", ");
      return `<li>
        <strong>H(${kind === "x" ? "X" : "Y"} | ${given})</strong> = ${h.toFixed(4)} бит
        <span style="color:var(--muted)"> · P(${given}) = ${pCond}</span>
        ${dist ? `<br><span class="mono" style="font-size:0.8rem">${dist}</span>` : ""}
      </li>`;
    })
    .join("");
}

function applySample(key) {
  const s = SAMPLES[key];
  $("labelsX").value = s.labelsX;
  $("labelsY").value = s.labelsY;
  $("matrixText").value = matrixToText(s.matrix);
  renderTable(s.matrix);
}

async function compute() {
  document.body.classList.add("loading");
  try {
    const matrix = readTable();
    const labels_x = parseLabels($("labelsX").value);
    const labels_y = parseLabels($("labelsY").value);
    const data = await apiPost("/api/entropy/compute", {
      matrix,
      labels_x,
      labels_y,
    });

    setKpi(data.entropy);
    $("marginalsOut").textContent = [
      `P(X): ${data.labelsX.map((l, i) => `${l}=${data.marginalX[i]}`).join(", ")}`,
      `P(Y): ${data.labelsY.map((l, j) => `${l}=${data.marginalY[j]}`).join(", ")}`,
      data.note ? `\n⚠ ${data.note}` : "",
    ].join("\n");

    renderPartial($("partialX"), data.partial.H_X_given_Y_equals, "x");
    renderPartial($("partialY"), data.partial.H_Y_given_X_equals, "y");

    $("jointOut").textContent = JSON.stringify(
      { labelsX: data.labelsX, labelsY: data.labelsY, joint: data.joint },
      null,
      2
    );

    const msg = `Расчёт выполнен (${data.units}).`;
    showStatus($("status"), data.note ? `${msg} ${data.note}` : msg);
  } catch (e) {
    showStatus($("status"), e.message, true);
  } finally {
    document.body.classList.remove("loading");
  }
}

$("btnSyncTable").addEventListener("click", () => {
  $("matrixText").value = matrixToText(readTable());
});

$("btnSyncText").addEventListener("click", () => {
  try {
    renderTable(textToMatrix($("matrixText").value));
    showStatus($("status"), "Таблица обновлена из текста.");
  } catch {
    showStatus($("status"), "Не удалось разобрать матрицу в текстовом поле.", true);
  }
});

$("btnCompute").addEventListener("click", compute);
$("btnSampleIndep").addEventListener("click", () => applySample("indep"));
$("btnSampleDep").addEventListener("click", () => applySample("dep"));
$("btnSampleDiag").addEventListener("click", () => applySample("diag"));

applySample("indep");
