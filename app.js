const app = document.querySelector("#app");
const stage = document.querySelector("#stage");
const amountInput = document.querySelector("#amount");
const amountMirror = document.querySelector("#amount-mirror");
const range = document.querySelector("#discount-range");
const explanation = document.querySelector("#discount-explanation");
const exceptions = document.querySelector("#exceptions");
const sliderArea = document.querySelector(".slider-area");
const track = document.querySelector("#track");
const thumb = document.querySelector("#thumb");
const trackFill = document.querySelector("#track-fill");
const state = { draft: "50", saved: 50 };
const discountLimits = { minimum: Number(range.min), maximum: Number(range.max) };
const exceptionGroup = { minimum: 250, count: 12 };
const assetPaths = [
  "assets/clear.svg", "assets/backspace.svg", "assets/thumb.svg",
  "assets/product-1.png", "assets/product-2.png",
  "assets/product-3-base.png", "assets/product-3.png"
];
const preparedImages = new Map();
const preparedFonts = new Map();

function boundedDiscount(amount) {
  return Math.max(discountLimits.minimum, Math.min(discountLimits.maximum, amount));
}

function discountPosition(amount) {
  return (boundedDiscount(amount) - discountLimits.minimum) / (discountLimits.maximum - discountLimits.minimum);
}

function positionExceptionGroup() {
  const travel = track.clientWidth - thumb.width;
  exceptions.style.left = `${sliderArea.offsetLeft + thumb.width / 2 + discountPosition(exceptionGroup.minimum) * travel}px`;
  exceptions.querySelector(".exception-amount").textContent = `${exceptionGroup.minimum} ₽`;
  exceptions.setAttribute("aria-label", `${exceptionGroup.count} товаров с минимальной скидкой ${exceptionGroup.minimum} рублей`);
}

function updateDraft(value) {
  state.draft = value.replace(/\D/g, "").slice(0, 4).replace(/^0+(?=\d)/, "");
  amountInput.value = state.draft;
  amountMirror.textContent = state.draft || " ";
  const amount = Number(state.draft);
  const position = discountPosition(amount);
  const thumbOffset = position * (track.clientWidth - thumb.width);
  range.value = String(boundedDiscount(amount));
  range.setAttribute("aria-valuetext", `${amount} рублей`);
  thumb.style.left = `${thumbOffset}px`;
  trackFill.style.width = `${thumbOffset + thumb.width / 2}px`;
  const hasExceptions = state.draft !== "" && amount > 0 && amount < exceptionGroup.minimum;
  exceptions.hidden = !hasExceptions;
  positionExceptionGroup();
  explanation.hidden = state.draft === "" || amount === 0;
  explanation.textContent = hasExceptions
    ? `Для ${exceptionGroup.count} товаров ${amount} ₽ меньше минимальной скидки, установили для них скидку ${exceptionGroup.minimum} руб`
    : `Для всех товаров установим скидку до ${boundedDiscount(amount)} ₽, если доставка выйдет дешевле – вычтем меньше`;
}

function focusAmount() {
  amountInput.focus({ preventScroll: true });
}

function replaceSelection(text) {
  const start = amountInput.selectionStart ?? state.draft.length;
  const end = amountInput.selectionEnd ?? start;
  const value = state.draft.slice(0, start) + text + state.draft.slice(end);
  updateDraft(value);
  focusAmount();
  const next = Math.min(start + text.length, state.draft.length);
  amountInput.setSelectionRange(next, next);
}

function backspace() {
  const start = amountInput.selectionStart ?? state.draft.length;
  const end = amountInput.selectionEnd ?? start;
  if (start !== end) replaceSelection("");
  else if (start > 0) {
    amountInput.setSelectionRange(start - 1, end);
    replaceSelection("");
  }
}

function saveAmount() {
  const amount = boundedDiscount(Number(state.draft) || discountLimits.minimum);
  updateDraft(String(amount));
  state.saved = amount;
  amountInput.blur();
  document.querySelector("#saved-status").textContent = `Скидка ${amount} рублей сохранена`;
}

function resize() {
  const viewport = window.visualViewport;
  const width = viewport?.width || window.innerWidth;
  const height = viewport?.height || window.innerHeight;
  const mobile = width <= 600;
  const scale = mobile ? width / 375 : Math.min(1, (height - 32) / 812);
  const appHeight = mobile ? height / scale : 812;
  stage.style.width = `${375 * scale}px`;
  stage.style.height = `${appHeight * scale}px`;
  app.style.height = `${appHeight}px`;
  app.style.transform = `scale(${scale})`;
}

amountInput.addEventListener("input", () => {
  const caret = amountInput.selectionStart;
  updateDraft(amountInput.value);
  amountInput.setSelectionRange(Math.min(caret, state.draft.length), Math.min(caret, state.draft.length));
});
amountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveAmount();
  }
  if (event.key === "Escape") {
    updateDraft(String(state.saved));
    amountInput.blur();
  }
});
range.addEventListener("input", () => {
  updateDraft(range.value);
  amountInput.blur();
});
document.querySelector("#clear").addEventListener("click", () => {
  updateDraft("");
  focusAmount();
});
document.querySelector("#done").addEventListener("click", saveAmount);
document.querySelector(".keys").addEventListener("pointerdown", (event) => {
  if (event.target.closest("button")) event.preventDefault();
});
document.querySelector(".keys").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.id === "backspace") backspace();
  else replaceSelection(button.dataset.key);
});
window.addEventListener("resize", resize);
window.visualViewport?.addEventListener("resize", resize);

async function prepareImage(path) {
  if (preparedImages.has(path)) return;
  const image = new Image();
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error(`Не удалось загрузить ${path}`));
  });
  image.src = path;
  await loaded;
  await image.decode();
  preparedImages.set(path, image);
}

async function prepareFont(weight, path) {
  if (preparedFonts.has(path)) return;
  const face = new FontFace("Avito Sans Text", `url("${path}")`, { weight: String(weight), style: "normal" });
  await face.load();
  document.fonts.add(face);
  preparedFonts.set(path, face);
}

async function start() {
  const retry = document.querySelector("#retry");
  const copy = document.querySelector("#loading-copy");
  retry.hidden = true;
  copy.textContent = "Загрузка…";
  let timeout;
  try {
    const ready = Promise.all([
      ...assetPaths.map(prepareImage),
      prepareFont(400, "assets/fonts/avito/AvitoSansText-Regular.otf"),
      prepareFont(500, "assets/fonts/avito/AvitoSansText-Medium.otf")
    ]);
    const timedOut = new Promise((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Ресурсы загружаются слишком долго")), 20000);
    });
    await Promise.race([ready, timedOut]);
    await document.fonts.ready;
    resize();
    app.hidden = false;
    updateDraft(state.draft);
    amountInput.setSelectionRange(state.draft.length, state.draft.length);
    await new Promise(requestAnimationFrame);
    app.inert = false;
    document.querySelector("#loading").hidden = true;
  } catch {
    copy.textContent = "Не удалось загрузить экран";
    retry.hidden = false;
  } finally {
    clearTimeout(timeout);
  }
}

document.querySelector("#retry").addEventListener("click", start);
start();
