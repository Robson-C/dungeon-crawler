"use strict";

// Rows and columns match the 40 × 40 tiles in assets/inventory-items.png.
const inventoryCatalog = [
  ["head", "Elmo com viseira", "Elmo de chifres", "Capuz em runas"],
  ["weapon", "Espada de guarda reta", "Sabre de lâmina curva", "Espada de cristal"],
  ["armor", "Peitoral de placas", "Gibão de couro", "Couraça laminada"],
  ["necklace", "Presa em cordão", "Medalhão solar", "Pingente de jade"],
  ["boots", "Botas de montaria", "Botas de placas", "Botas de tecido"],
  ["ring", "Sinete de bronze", "Aro de espinhos", "Anel de jade"]
].flatMap(([category, ...names], row) => names.map((name, column) => ({
  category, name, iconPosition: `${column * 50}% ${row * 20}%`
})));

function createInventoryView(dialog) {
  const bagGrid = dialog.querySelector("#bag-slots");
  const feedback = dialog.querySelector("#inventory-feedback");
  const header = dialog.querySelector(".inventory-header");
  const slotsByButton = new WeakMap();
  let selected = null;
  let drag = null;

  function register(button, label, category = null) {
    const icon = document.createElement("span");
    icon.className = "inventory-icon";
    icon.setAttribute("aria-hidden", "true");
    const slot = { button, icon, label, category, item: null };
    slotsByButton.set(button, slot);
    button.addEventListener("click", event => {
      if (event.detail === 0) activate(slot);
    });
    button.addEventListener("pointerdown", event => beginDrag(event, slot));
    return slot;
  }

  const equipment = Array.from(dialog.querySelectorAll("[data-equipment]"), button =>
    register(button, button.textContent.trim(), button.dataset.equipment)
  );
  const bag = Array.from({ length: 24 }, (_, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "bag-slot";
    bagGrid.append(button);
    return register(button, `Mochila ${index + 1}`);
  });

  function draw(slot) {
    const { button, icon, label, category, item } = slot;
    button.setAttribute("aria-label", `${label}: ${item ? item.name : "vazio"}`);
    button.setAttribute("aria-pressed", String(slot === selected));
    button.toggleAttribute("data-occupied", Boolean(item));
    button.title = item ? item.name : label;
    if (item) {
      icon.style.backgroundPosition = item.iconPosition;
      button.replaceChildren(icon);
    } else {
      button.textContent = category ? label : "";
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
    drag = { source, pointerId, startX: x, startY: y, x, y, ghost: null, target: null, frame: null };
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

  function scrollDrag() {
    if (!drag?.ghost) return;
    if (dialog.scrollHeight > dialog.clientHeight) {
      const { left, right, bottom } = dialog.getBoundingClientRect();
      const top = header.getBoundingClientRect().bottom;
      const edge = Math.min(28, (bottom - top) / 3);
      const { x, y } = drag;
      if (edge > 0 && x >= left && x <= right && y >= top - edge && y <= bottom + edge) {
        const before = dialog.scrollTop;
        if (y < top + edge) dialog.scrollTop -= 6;
        else if (y > bottom - edge) dialog.scrollTop += 6;
        if (dialog.scrollTop !== before) highlightTarget();
      }
    }
    drag.frame = requestAnimationFrame(scrollDrag);
  }

  function moveDrag(event) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (!drag.ghost) {
      if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 5) return;
      select(null);
      const { button, icon } = drag.source;
      drag.ghost = icon.cloneNode(true);
      drag.ghost.classList.add("inventory-drag-ghost");
      drag.ghost.style.width = `${icon.getBoundingClientRect().width}px`;
      document.body.append(drag.ghost);
      button.classList.add("inventory-drag-source");
      drag.frame = requestAnimationFrame(scrollDrag);
    }
    drag.ghost.style.left = `${drag.x}px`;
    drag.ghost.style.top = `${drag.y}px`;
    highlightTarget();
  }

  function clearDrag() {
    if (!drag) return;
    const { source, ghost, target, frame, pointerId } = drag;
    drag = null;
    source.button.classList.remove("inventory-drag-source");
    target?.button.classList.remove("inventory-drop-target");
    ghost?.remove();
    if (frame !== null) cancelAnimationFrame(frame);
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
    reset() {
      clearDrag();
      select(null);
      for (const slot of equipment) {
        slot.item = null;
        draw(slot);
      }
      bag.forEach((slot, index) => {
        slot.item = inventoryCatalog[index] ?? null;
        draw(slot);
      });
      feedback.textContent = "";
    }
  };
}
