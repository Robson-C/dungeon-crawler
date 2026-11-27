"use strict";

// Item icons are sampled individually from the approved artwork.
const referenceIconColumns = [662, 783, 903, 1023, 1143, 1259];
const referenceIconRows = [302, 423, 543];
const inventoryCatalog = [
  ["head", "Elmo com viseira", "Elmo de chifres", "Capuz em runas"],
  ["weapon", "Espada de guarda reta", "Sabre de lâmina curva", "Espada de cristal"],
  ["armor", "Peitoral de placas", "Gibão de couro", "Couraça laminada"],
  ["necklace", "Presa em cordão", "Medalhão solar", "Pingente de jade"],
  ["boots", "Botas de montaria", "Botas de placas", "Botas de tecido"],
  ["ring", "Sinete de bronze", "Aro de espinhos", "Anel de jade"]
].flatMap(([category, ...names], row) => names.map((name, column) => {
  if (category === "weapon" && column === 0) return gameItems.shortSword;
  const x = referenceIconColumns[(row % 2) * 3 + column];
  const y = referenceIconRows[Math.floor(row / 2)];
  return {
    category, name,
    iconPosition: `${column * 50}% ${row * 20}%`,
    referenceIconPosition: `${100 * x / (1536 - 96)}% ${100 * y / (1024 - 96)}%`
  };
})).concat(Object.values(gameItems).filter(item => item !== gameItems.shortSword));

function createInventoryView(dialog) {
  const bagGrid = dialog.querySelector("#bag-slots");
  const feedback = dialog.querySelector("#inventory-feedback");
  const slotsByButton = new WeakMap();
  let selected = null;
  let drag = null;

  function register(button, label, category = null, initialItem = null) {
    const icon = document.createElement("span");
    icon.className = "inventory-icon";
    icon.setAttribute("aria-hidden", "true");
    const slot = { button, icon, label, category, initialItem, item: initialItem };
    slotsByButton.set(button, slot);
    button.addEventListener("click", event => {
      if (event.detail === 0) activate(slot);
    });
    button.addEventListener("pointerdown", event => beginDrag(event, slot));
    return slot;
  }

  const equipment = Array.from(dialog.querySelectorAll("[data-equipment]"), button =>
    register(button, button.textContent.trim(), button.dataset.equipment,
      button.dataset.equipment === "weapon" ? gameItems.shortSword : null)
  );
  const bag = Array.from({ length: 24 }, (_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bag-slot";
    bagGrid.append(button);
    const item = inventoryCatalog[index];
    return register(button, `Mochila ${index + 1}`, null,
      item === gameItems.shortSword ? null : item ?? null);
  });

  function draw(slot) {
    const { button, icon, label, category, item } = slot;
    button.setAttribute("aria-label", `${label}: ${item ? item.name : "vazio"}`);
    button.setAttribute("aria-pressed", String(slot === selected));
    button.toggleAttribute("data-occupied", Boolean(item));
    button.title = item ? item.name : label;
    if (item) {
      icon.className = "inventory-icon";
      icon.style.background = item.icon ? `url("${item.icon}") center / contain no-repeat` : "";
      icon.style.maskImage = item.icon ? "none" : "";
      icon.style.rotate = item.icon ? "-45deg" : "";
      icon.style.setProperty("--painted-icon-position", item.iconPosition ?? "0% 0%");
      icon.style.setProperty("--reference-icon-position", item.referenceIconPosition ?? "0% 0%");
      button.replaceChildren(icon);
    } else if (category) {
      icon.className = "equipment-placeholder";
      icon.removeAttribute("style");
      button.replaceChildren(icon);
    } else {
      button.replaceChildren();
    }
  }

  function select(slot) {
    selected?.button.setAttribute("aria-pressed", "false");
    selected = slot;
    selected?.button.setAttribute("aria-pressed", "true");
  }

  function canMove(source, target) {
    if (!source.item || !target || source === target) return false;
    if (target.category) return !source.category && target.category === source.item.category;
    return !source.category || !target.item;
  }

  function moveItem(source, target) {
    if (!target || target === source) return false;
    if (!canMove(source, target)) {
      feedback.textContent = source.category
        ? "Use um espaço vazio na mochila para desequipar."
        : "Este item não cabe nesse slot.";
      return false;
    }
    const item = source.item;
    // A swapped item goes back to the exact slot vacated by the moving item.
    source.item = target.item;
    target.item = item;
    draw(source);
    draw(target);
    feedback.textContent = `${item.name} no slot ${target.label}.`;
    return true;
  }

  function activate(target) {
    if (drag) return;
    if (selected === target) {
      select(null);
      feedback.textContent = "Seleção cancelada.";
      return;
    }
    if (!selected) {
      if (!target.item) return;
      select(target);
      feedback.textContent = `${target.item.name} selecionado. Escolha o destino.`;
      return;
    }
    if (moveItem(selected, target)) select(null);
  }

  function beginDrag(event, source) {
    if (drag || !dialog.open || !source.item || !event.isPrimary || event.button !== 0) return;
    const { pointerId, clientX: x, clientY: y } = event;
    source.button.setPointerCapture(pointerId);
    drag = { source, pointerId, startX: x, startY: y, x, y, ghost: null, target: null };
  }

  function slotAt(x, y) {
    const button = document.elementFromPoint(x, y)?.closest("button");
    return slotsByButton.get(button);
  }

  function highlightTarget() {
    const slot = slotAt(drag.x, drag.y);
    const target = canMove(drag.source, slot) ? slot : null;
    if (target === drag.target) return;
    drag.target?.button.classList.remove("inventory-drop-target");
    drag.target = target;
    target?.button.classList.add("inventory-drop-target");
  }

  function moveDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.ghost) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 5) return;
      select(null);
      const { button, icon } = drag.source;
      const iconStyle = getComputedStyle(icon);
      drag.ghost = icon.cloneNode(true);
      drag.ghost.classList.add("inventory-drag-ghost");
      drag.ghost.style.width = iconStyle.width;
      drag.ghost.style.height = iconStyle.height;
      document.body.append(drag.ghost);
      button.classList.add("inventory-drag-source");
    }
    drag.ghost.style.left = `${drag.x}px`;
    drag.ghost.style.top = `${drag.y}px`;
    highlightTarget();
  }

  function clearDrag() {
    if (!drag) return;
    const { source, ghost, target, pointerId } = drag;
    drag = null;
    source.button.classList.remove("inventory-drag-source");
    target?.button.classList.remove("inventory-drop-target");
    ghost?.remove();
    if (source.button.hasPointerCapture(pointerId)) source.button.releasePointerCapture(pointerId);
  }

  dialog.addEventListener("pointermove", moveDrag);
  dialog.addEventListener("pointerup", event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { source, ghost } = drag;
    const target = ghost && dialog.open ? slotAt(event.clientX, event.clientY) : null;
    clearDrag();
    if (target) moveItem(source, target);
  });
  for (const type of ["pointercancel", "lostpointercapture"]) {
    dialog.addEventListener(type, event => {
      if (drag?.pointerId === event.pointerId) clearDrag();
    });
  }
  window.addEventListener("blur", clearDrag);
  dialog.addEventListener("close", () => {
    clearDrag();
    select(null);
    feedback.textContent = "";
  });
  return {
    getEquipped(category) {
      return equipment.find(slot => slot.category === category)?.item ?? null;
    },
    reset() {
      clearDrag();
      select(null);
      for (const slot of [...equipment, ...bag]) {
        slot.item = slot.initialItem;
        draw(slot);
      }
      feedback.textContent = "";
    }
  };
}
