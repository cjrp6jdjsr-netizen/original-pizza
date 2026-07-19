const canvas = document.getElementById("pizzaCanvas");
const ctx = canvas.getContext("2d");

let items = [];
let lockedItems = new Set();
let history = [];

let mode = null;
let activeHandle = null;
let selectedItem = null;
let draggingImg = null;
let isLongPress = false;
let longPressUsed = false;

function guardClick() {
  if (longPressUsed) {
    longPressUsed = false;
    return true;
  }
  return false;
}

// 枠消し
document.addEventListener("mousedown", e => {
  const t = e.target;

  const inCanvas = (t === canvas);
  const inMaterials = t.closest("#materials") !== null;
  const inControls = t.closest(".control-group") !== null;

  if (!inCanvas && !inMaterials && !inControls) {
    selectedItem = null;
    redraw();
  }
});

document.addEventListener("touchstart", e => {
  const t = e.target;

  const inCanvas = (t === canvas);
  const inMaterials = t.closest("#materials") !== null;
  const inControls = t.closest(".control-group") !== null;

  if (!inCanvas && !inMaterials && !inControls) {
    selectedItem = null;
    redraw();
  }
});

// 土台
const baseImg = new Image();
baseImg.src = "images/pizza.png";

baseImg.onload = () => {
  const baseItem = {
    img: baseImg,
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 630,
    angle: 0
  };

  items.push(baseItem);
  lockedItems.add(baseItem);
  saveHistory();
  redraw();
};

// ボタン：移動（長押しのみ）
document.getElementById("upBtn").addEventListener("mousedown", () => startMove(0, -1));
document.getElementById("downBtn").addEventListener("mousedown", () => startMove(0, 1));
document.getElementById("leftBtn").addEventListener("mousedown", () => startMove(-1, 0));
document.getElementById("rightBtn").addEventListener("mousedown", () => startMove(1, 0));

document.getElementById("upBtn").addEventListener("touchstart", () => startMove(0, -1));
document.getElementById("downBtn").addEventListener("touchstart", () => startMove(0, 1));
document.getElementById("leftBtn").addEventListener("touchstart", () => startMove(-1, 0));
document.getElementById("rightBtn").addEventListener("touchstart", () => startMove(1, 0));

// 長押し共通
function startAction(fn) {
  longPressUsed = true;
  fn();
  actionInterval = setInterval(fn, 50);
}

// 移動処理
function moveSelected(dx, dy) {
  if (selectedItem && !lockedItems.has(selectedItem)) {
    selectedItem.x += dx;
    selectedItem.y += dy;
    redraw();
  }
}

let moveInterval = null;

function startMove(dx, dy) {
  moveSelected(dx, dy);
  moveInterval = setInterval(() => moveSelected(dx, dy), 10);
}

// サイズ変更・回転処理
function resizeSelected(delta) {
  if (selectedItem && !lockedItems.has(selectedItem)) {
    selectedItem.size = Math.max(20, selectedItem.size + delta);
    redraw();
  }
}

function rotateSelected(deltaAngle) {
  if (selectedItem && !lockedItems.has(selectedItem)) {
    selectedItem.angle += deltaAngle;
    redraw();
  }
}

let actionInterval = null;

// 全ての長押しを止める
function stopAllActions() {
  clearInterval(moveInterval);
  clearInterval(actionInterval);
}

document.addEventListener("mouseup", stopAllActions, { passive: false });
document.addEventListener("touchend", stopAllActions, { passive: false });

// ボタン取得
const upBtn = document.getElementById("upBtn");
const downBtn = document.getElementById("downBtn");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");

const biggerBtn = document.getElementById("biggerBtn");
const smallerBtn = document.getElementById("smallerBtn");
const rotateBtn = document.getElementById("rotateBtn");
const flipXBtn = document.getElementById("flipXBtn");
const flipYBtn = document.getElementById("flipYBtn");

const longPressButtons = [
  upBtn,
  downBtn,
  leftBtn,
  rightBtn,
  biggerBtn,
  smallerBtn,
  rotateBtn,
  flipXBtn,
  flipYBtn
];

longPressButtons.forEach(btn => {
  let pressTimer = null;

  // タッチ開始
  btn.addEventListener("touchstart", e => {
    e.preventDefault();
    pressTimer = setTimeout(() => {
      startAction(() => {
        if (btn === upBtn) moveSelected(0, -1);
        if (btn === downBtn) moveSelected(0, 1);
        if (btn === leftBtn) moveSelected(-1, 0);
        if (btn === rightBtn) moveSelected(1, 0);

        if (btn === biggerBtn) resizeSelected(5);
        if (btn === smallerBtn) resizeSelected(-5);
        if (btn === rotateBtn) rotateSelected(Math.PI / 32);

        if (btn === flipXBtn) flipHorizontal();
        if (btn === flipYBtn) flipVertical();
      });
    }, 100); // 長押し判定
  });

  // タッチ終了（長押し停止）
  btn.addEventListener("touchend", e => {
    clearTimeout(pressTimer);
    stopAllActions();   
    e.preventDefault();
  });

  // PC用
  btn.addEventListener("mousedown", () => {
    startAction(() => {
      if (btn === upBtn) moveSelected(0, -1);
      if (btn === downBtn) moveSelected(0, 1);
      if (btn === leftBtn) moveSelected(-1, 0);
      if (btn === rightBtn) moveSelected(1, 0);

      if (btn === biggerBtn) resizeSelected(5);
      if (btn === smallerBtn) resizeSelected(-5);
      if (btn === rotateBtn) rotateSelected(Math.PI / 32);

      if (btn === flipXBtn) flipHorizontal();
      if (btn === flipYBtn) flipVertical();
    });
  });

  btn.addEventListener("mouseup", () => {
    stopAllActions();   
  });
});

//複製
document.getElementById("duplicateBtn").addEventListener("click", () => {
  if (!selectedItem || lockedItems.has(selectedItem)) return;

  saveHistory();

  const img = new Image();
  img.src = selectedItem.img.src;

  const newItem = {
    img,
    x: selectedItem.x + 20,   
    y: selectedItem.y + 20,
    size: selectedItem.size,
    angle: selectedItem.angle,
    flipX: selectedItem.flipX ?? false,
    flipY: selectedItem.flipY ?? false
  };

  items.push(newItem);
  selectedItem = newItem;
  bringToFront(newItem);
  redraw();
});


//戻す

//保存
function saveHistory() {
  const snapshot = items.map(item => ({
    imgSrc: item.img.src,  
    x: item.x,
    y: item.y,
    size: item.size,
    angle: item.angle
  }));
  history.push(snapshot);
}

function undo() {
  if (history.length === 0) return;

  const previous = history.pop();

  let loadedCount = 0;

  items = previous.map(item => {
    const img = new Image();
    img.src = item.imgSrc;

    if (img.complete) {
      loadedCount++;
    } else {
      img.onload = () => {
        loadedCount++;
        if (loadedCount === previous.length) {
          redraw();
        }
      };
    }

    return {
      img,
      x: item.x,
      y: item.y,
      size: item.size,
      angle: item.angle
    };
  });

  selectedItem = null;

  const baseItem = items.find(i => i.img.src.includes("pizza.png"));
  lockedItems = new Set([baseItem]);

  if (loadedCount === previous.length) {
    redraw();
  }
}

document.getElementById("undoBtn").addEventListener("click", undo);

//ロック

document.getElementById("lockBtn").addEventListener("click", () => {
  if (selectedItem) lockedItems.add(selectedItem);
});

document.getElementById("unlockBtn").addEventListener("click", () => {
  if (selectedItem) lockedItems.delete(selectedItem);
});

document.getElementById("upBtn").addEventListener("click", () => {
  if (selectedItem && !lockedItems.has(selectedItem)) {
    selectedItem.y -= 1;
    redraw();
  }
});
document.getElementById("downBtn").addEventListener("click", () => {
  if (selectedItem && !lockedItems.has(selectedItem)) {
    selectedItem.y += 1;
    redraw();
  }
});
document.getElementById("leftBtn").addEventListener("click", () => {
  if (selectedItem && !lockedItems.has(selectedItem)) {
    selectedItem.x -= 1;
    redraw();
  }
});
document.getElementById("rightBtn").addEventListener("click", () => {
  if (selectedItem && !lockedItems.has(selectedItem)) {
    selectedItem.x += 1;
    redraw();
  }
});


//前面背面ボタン
document.getElementById("toFrontBtn").addEventListener("click", () => {
  if (!selectedItem) return;
  items = items.filter(i => i !== selectedItem);
  items.push(selectedItem);
  redraw();
});

document.getElementById("toBackBtn").addEventListener("click", () => {
  if (!selectedItem) return;
  if (selectedItem.img.src.includes("pizza.png")) return; // 

  items = items.filter(i => i !== selectedItem);

  // ★ 土台の直後（index 1）に入れる
  items.splice(1, 0, selectedItem);

  redraw();
});


// PC用ドラッグ開始
document.querySelectorAll(".ingredient").forEach(img => {
  img.addEventListener("dragstart", e => {
    e.dataTransfer.setData("src", e.target.src);
  });
});

// PC用ドロップ
canvas.addEventListener("dragover", e => e.preventDefault());
canvas.addEventListener("drop", e => {
  e.preventDefault();
  const src = e.dataTransfer.getData("src");
  if (!src) return;

  const img = new Image();
  img.src = src;
  img.onload = () => {
   const newItem = {
  img: img,
  x: e.offsetX,
  y: e.offsetY,
  size: 80,
  angle: 0
};

saveHistory(); 
items.push(newItem);

// 新しく置いた素材を選択状態にする
selectedItem = newItem;
bringToFront(selectedItem);

redraw();

  };
});

// PC用クリック（選択）
canvas.addEventListener("mousedown", e => {
  const x = e.offsetX;
  const y = e.offsetY;

  selectedItem = getItemAt(x, y);
if (!selectedItem) return;   

bringToFront(selectedItem);  

const h = getHandleAt(selectedItem, x, y);
if (h) {
  activeHandle = h.type;
  mode = (h.type === "rotate") ? "rotate" : "resize";
} else {
  mode = "move";
}

});

// PC用ドラッグ移動・編集
canvas.addEventListener("mousemove", e => {
  if (lockedItems.has(selectedItem)) return;
  if (!selectedItem || !mode || e.buttons !== 1) return;

  const x = e.offsetX;
  const y = e.offsetY;

  if (mode === "move") {
    selectedItem.x = x;
    selectedItem.y = y;
  }

  if (mode === "resize") {
    const dx = x - selectedItem.x;
    const dy = y - selectedItem.y;
    selectedItem.size = Math.max(20, Math.sqrt(dx*dx + dy*dy) * 2);
  }

  if (mode === "rotate") {
    const dx = x - selectedItem.x;
    const dy = y - selectedItem.y;
    selectedItem.angle = Math.atan2(dy, dx);
  }

  redraw();
});

// PC用マウス離す
canvas.addEventListener("mouseup", () => {
  if (selectedItem && mode) {
    saveHistory();   
  }
  mode = null;
  activeHandle = null;
});

// スマホ用タッチで素材選択
canvas.addEventListener("touchstart", e => {
  const rect = canvas.getBoundingClientRect();
  const touch = e.changedTouches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  selectedItem = getItemAt(x, y);
  if (!selectedItem) return;

  bringToFront(selectedItem);

  const h = getHandleAt(selectedItem, x, y);
  if (h) {
    activeHandle = h.type;
    mode = (h.type === "rotate") ? "rotate" : "resize";
  } else {
    mode = "move";
  }

  redraw();
});



// スマホ用タッチ移動・編集
canvas.addEventListener("touchmove", e => {
  if (lockedItems.has(selectedItem)) return;
  if (!selectedItem || !mode) return;

  const rect = canvas.getBoundingClientRect();
  const touch = e.changedTouches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;

  if (mode === "move") {
    selectedItem.x = x;
    selectedItem.y = y;
  }

  if (mode === "resize") {
    const dx = x - selectedItem.x;
    const dy = y - selectedItem.y;
    selectedItem.size = Math.max(20, Math.sqrt(dx*dx + dy*dy) * 2);
  }

  if (mode === "rotate") {
    const dx = x - selectedItem.x;
    const dy = y - selectedItem.y;
    selectedItem.angle = Math.atan2(dy, dx);
  }

  redraw();
});

// スマホ用タッチ離す
canvas.addEventListener("touchend", () => {
  if (selectedItem && mode) {
    saveHistory();   
  }
  mode = null;
  activeHandle = null;
});

// --- 描画処理 ---
function redraw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 素材描画
  items.forEach(item => {
    const s = item.size / 2;

    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(item.angle);
    ctx.scale(item.flipX ? -1 : 1, item.flipY ? -1 : 1);
    ctx.drawImage(item.img, -s, -s, item.size, item.size);
    ctx.restore();
  });

  // 選択枠＋ハンドル
  if (selectedItem) {
    ctx.save();
    ctx.translate(selectedItem.x, selectedItem.y);
    ctx.rotate(selectedItem.angle);

    const s = selectedItem.size / 2;

    ctx.strokeStyle = "blue";
    ctx.lineWidth = 2;
    ctx.strokeRect(-s, -s, selectedItem.size, selectedItem.size);

    const handles = [
      { x: -s, y: -s, type: "nw" },
      { x:  s, y: -s, type: "ne" },
      { x: -s, y:  s, type: "sw" },
      { x:  s, y:  s, type: "se" }
    ];

    ctx.fillStyle = "white";
    ctx.strokeStyle = "blue";

    handles.forEach(h => {
      ctx.beginPath();
      ctx.arc(h.x, h.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    const rotateY = -s - 10;
    ctx.beginPath();
    ctx.arc(0, rotateY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

// --- ハンドル判定 ---
function getHandleAt(item, x, y) {
  const s = item.size / 2;
  const cos = Math.cos(item.angle);
  const sin = Math.sin(item.angle);

  const baseHandle = Math.max(10, item.size * 0.15);
  const rotateHandle = Math.max(10, item.size * 0.12);

  const localX = 0;
  const localY = -s - 10;
  const rotateHandleX = item.x + (localX * cos - localY * sin);
  const rotateHandleY = item.y + (localX * sin + localY * cos);

  const dx = x - rotateHandleX;
  const dy = y - rotateHandleY;

  if (Math.sqrt(dx*dx + dy*dy) < rotateHandle) {
    return { type: "rotate" };
  }

  const corners = [
    { ox: -s, oy: -s, type: "nw" },
    { ox:  s, oy: -s, type: "ne" },
    { ox: -s, oy:  s, type: "sw" },
    { ox:  s, oy:  s, type: "se" }
  ];

  for (const c of corners) {
    const hx = item.x + (c.ox * cos - c.oy * sin);
    const hy = item.y + (c.ox * sin + c.oy * cos);

    const dx2 = x - hx;
    const dy2 = y - hy;

    if (Math.sqrt(dx2*dx2 + dy2*dy2) < baseHandle) {
      return { type: c.type };
    }
  }

  return null;
}

// --- 素材選択判定 ---
function getItemAt(x, y) {
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];

    if (item.img.src.includes("pizza.png")) continue;

    if (
      x > item.x - item.size / 2 &&
      x < item.x + item.size / 2 &&
      y > item.y - item.size / 2 &&
      y < item.y + item.size / 2
    ) {
      return item;
    }
  }
  return null;
}

function bringToFront(item) {
  if (item.img.src.includes("pizza.png")) return; 

  items = items.filter(i => i !== item);
  items.push(item);
}


// --- ボタン操作 ---
deleteBtn.addEventListener("click", () => {
  if (guardClick()) return;

  if (selectedItem) {
    saveHistory();
    items = items.filter(item => item !== selectedItem);
    selectedItem = null;
    redraw();
  }
});

resetBtn.addEventListener("click", () => {
  if (guardClick()) return;

  saveHistory();
  items = [];
  lockedItems = new Set();

  const baseItem = {
    img: baseImg,
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: 630,
    angle: 0
  };

  items.push(baseItem);
  lockedItems.add(baseItem);

  redraw();
});

exportBtn.addEventListener("click", () => {
  if (guardClick()) return;

  const dataURL = canvas.toDataURL("image/png");
  const win = window.open();
  win.document.write(`<img src="${dataURL}" style="width:100%;"/>`);
});


// 反転
function flipHorizontal() {
  if (selectedItem && !lockedItems.has(selectedItem)) {
    selectedItem.flipX = !selectedItem.flipX;
    redraw();
  }
}

function flipVertical() {
  if (selectedItem && !lockedItems.has(selectedItem)) {
    selectedItem.flipY = !selectedItem.flipY;
    redraw();
  }
}

if (flipXBtn) {
  flipXBtn.addEventListener("mousedown", flipHorizontal);
  flipXBtn.addEventListener("touchstart", flipHorizontal);
}

if (flipYBtn) {
  flipYBtn.addEventListener("mousedown", flipVertical);
  flipYBtn.addEventListener("touchstart", flipVertical);
}
document.addEventListener("keydown", e => {
  if (!selectedItem || lockedItems.has(selectedItem)) return;

  let moved = false;
  const speed = e.shiftKey ? 5 : 1;
})
  //キーバインド

 const keyState = {};

document.addEventListener("keydown", e => {
  if (!selectedItem) return;

  let moved = false;
  const speed = e.shiftKey ? 5 : 1;

  // --- ロック解除（Shift + F） ---
  if (e.key === "f" && e.shiftKey) {
    lockedItems.delete(selectedItem);
    redraw();
    return;
  }

  if (lockedItems.has(selectedItem)) return;

  // --- 削除 ---
  if (e.key === "Delete" || e.key === "Backspace") {
    saveHistory();
    items = items.filter(item => item !== selectedItem);
    selectedItem = null;
    redraw();
    return;
  }

  // --- 移動
  if (["w", "a", "s", "d"].includes(e.key)) {

    if (!keyState[e.key]) {
      keyState[e.key] = true; 
    }

    if (e.key === "w") selectedItem.y -= speed;
    if (e.key === "s") selectedItem.y += speed;
    if (e.key === "a") selectedItem.x -= speed;
    if (e.key === "d") selectedItem.x += speed;

    moved = true;
  }

  // --- 上下反転（↑） ---
  if (e.key === "ArrowUp") {
    selectedItem.flipY = !selectedItem.flipY;
    redraw();
    return;
  }

  // --- 左右反転（→） ---
  if (e.key === "ArrowRight") {
    selectedItem.flipX = !selectedItem.flipX;
    redraw();
    return;
  }

  // --- 回転・リセット（R） ---
  if (e.key === "r") {
    if (e.altKey) {
      resetCanvas();
      return;
    }
    selectedItem.angle += Math.PI / 32;
    redraw();
    return;
  }

  // --- サイズ変更
  if (["1", "2"].includes(e.key)) {

    if (!keyState[e.key]) {
      keyState[e.key] = true; 
    }

    if (e.key === "1") selectedItem.size += 5;
    if (e.key === "2") selectedItem.size = Math.max(20, selectedItem.size - 5);

    moved = true;
  }

  // --- 複製（Q） ---
  if (e.key === "q") {
    duplicateSelected();
    return;
  }

  if (e.key === "z") {
    tobackBtn();
    return;
  }

  // --- Undo（X） ---
  if (e.key === "x") {
    undo();
    return;
  }

  // --- ロック（F） ---
  if (e.key === "f") {
    lockedItems.add(selectedItem);
    return;
  }

  if (moved) redraw();
});

document.addEventListener("keyup", e => {
  if (["w", "a", "s", "d", "1", "2"].includes(e.key)) {
    keyState[e.key] = false;
  }
});
