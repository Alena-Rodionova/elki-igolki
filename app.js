import { HOUSES } from './data.js';
import { renderVillageMap } from './map.js';

const APP_STORAGE_KEY = 'khvoya_ozero_app_v1';

const DEFAULT_FILTERS = {
  minGuests: 1,
  maxPrice: 25000,
  onlyFree: false
};

const state = {
  houses: structuredClone(HOUSES),
  selectedHouseId: 1,
  selectionResetReason: '',
  storageWarning: '',
  bookings: [],
  nextBookingNumber: 1001,
  isSubmittingBooking: false,
  filters: { ...DEFAULT_FILTERS }
};

const els = {
  headerStats: document.getElementById('headerStats'),
  resetDemoBtn: document.getElementById('resetDemoBtn'),
  storageAlertBox: document.getElementById('storageAlertBox'),
  filterGuests: document.getElementById('filterGuests'),
  filterPrice: document.getElementById('filterPrice'),
  priceValue: document.getElementById('priceValue'),
  filterOnlyFree: document.getElementById('filterOnlyFree'),
  resetFiltersBtn: document.getElementById('resetFiltersBtn'),
  mapContainer: document.getElementById('villageMapContainer'),
  detailsPanel: document.getElementById('houseDetailsPanel'),
  filterNoticeBox: document.getElementById('filterNoticeBox'),
  housesList: document.getElementById('housesList'),
  housesCountLabel: document.getElementById('housesCountLabel'),
  myBookingsList: document.getElementById('myBookingsList'),
  bookingsCountBadge: document.getElementById('bookingsCountBadge')
};

function init() {
  loadAppState();
  syncOccupiedStatus();
  bindEvents();
  renderAll();
}

function isValidBookingItem(item) {
  return (
    item &&
    typeof item === 'object' &&
    typeof item.bookingId === 'number' &&
    typeof item.bookingNumber === 'string' &&
    typeof item.houseId === 'number' &&
    typeof item.houseName === 'string' &&
    typeof item.guestsCount === 'number' &&
    typeof item.nights === 'number' &&
    typeof item.totalPrice === 'number'
  );
}

function loadAppState() {
  state.storageWarning = '';

  let raw = null;
  try {
    raw = localStorage.getItem(APP_STORAGE_KEY);
  } catch {
    state.bookings = [];
    state.nextBookingNumber = 1001;
    state.storageWarning =
      'Браузер запретил доступ к localStorage. Брони работают только до перезагрузки страницы.';
    return;
  }

  if (!raw) {
    state.bookings = [];
    state.nextBookingNumber = 1001;
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray(parsed.bookings) ||
      !parsed.bookings.every(isValidBookingItem)
    ) {
      throw new Error('Invalid schema');
    }

    const validHouseIds = new Set(HOUSES.map((h) => h.id));
    state.bookings = parsed.bookings.filter((b) => validHouseIds.has(b.houseId));
    state.nextBookingNumber =
      Number.isInteger(parsed.nextBookingNumber) && parsed.nextBookingNumber >= 1001
        ? parsed.nextBookingNumber
        : 1001 + state.bookings.length;
  } catch {
    state.bookings = [];
    state.nextBookingNumber = 1001;
    try {
      localStorage.removeItem(APP_STORAGE_KEY);
    } catch {
      // хранилище недоступно
    }
    state.storageWarning =
      'Сохранённые ранее данные броней были повреждены и сброшены к исходному состоянию.';
  }
}

function saveAppState() {
  try {
    const payload = JSON.stringify({
      bookings: state.bookings,
      nextBookingNumber: state.nextBookingNumber
    });
    localStorage.setItem(APP_STORAGE_KEY, payload);
    state.storageWarning = '';
  } catch {
    state.storageWarning =
      'Не удалось сохранить бронь в localStorage (запрет браузера или нехватка памяти). Изменения действуют только в текущей вкладке.';
  }
}

function resetDemoState() {
  const confirmed = window.confirm(
    'Сбросить учебное демо? Все ваши брони будут удалены, а занятость домов вернётся к исходной.'
  );
  if (!confirmed) return;

  state.bookings = [];
  state.nextBookingNumber = 1001;
  state.selectedHouseId = 1;
  state.selectionResetReason = 'Демо сброшено: исходные дома и статусы восстановлены.';
  state.storageWarning = '';

  try {
    localStorage.removeItem(APP_STORAGE_KEY);
  } catch {
    state.storageWarning =
      'Демо сброшено в текущей вкладке, но браузер заблокировал очистку localStorage.';
  }

  syncOccupiedStatus();
  renderAll();
}
function syncOccupiedStatus() {
    const bookedIds = new Set(state.bookings.map((b) => b.houseId));
    state.houses = HOUSES.map((house) => ({
      ...house,
      занятость: house.занятость || bookedIds.has(house.id)
    }));
  
    if (state.selectedHouseId !== null) {
      const selected = state.houses.find((h) => h.id === state.selectedHouseId);
      if (!selected || selected.занятость) {
        state.selectedHouseId = null;
      }
    }
  }
  
  function getFilteredHouses() {
    const { minGuests, maxPrice, onlyFree } = state.filters;
    return state.houses.filter((h) => {
      if (h.вместимость < minGuests) return false;
      if (h.ценаЗаНочь > maxPrice) return false;
      if (onlyFree && h.занятость) return false;
      return true;
    });
  }
  
  function formatPrice(num) {
    return new Intl.NumberFormat('ru-RU').format(num);
  }
  
  function resetFilters() {
    state.filters = { ...DEFAULT_FILTERS };
    state.selectionResetReason = '';
    els.filterGuests.value = String(DEFAULT_FILTERS.minGuests);
    els.filterPrice.value = String(DEFAULT_FILTERS.maxPrice);
    els.priceValue.textContent = formatPrice(DEFAULT_FILTERS.maxPrice);
    els.filterOnlyFree.checked = false;
    renderAll();
  }
  
  function bindEvents() {
    els.resetDemoBtn.addEventListener('click', resetDemoState);
  
    els.filterGuests.addEventListener('change', (e) => {
      state.filters.minGuests = Number(e.target.value);
      state.selectionResetReason = '';
      renderAll();
    });
  
    els.filterPrice.addEventListener('input', (e) => {
      state.filters.maxPrice = Number(e.target.value);
      els.priceValue.textContent = formatPrice(state.filters.maxPrice);
      state.selectionResetReason = '';
      renderAll();
    });
  
    els.filterOnlyFree.addEventListener('change', (e) => {
      state.filters.onlyFree = e.target.checked;
      state.selectionResetReason = '';
      renderAll();
    });
  
    els.resetFiltersBtn.addEventListener('click', resetFilters);
  }
  
  function selectHouse(houseId) {
    const house = state.houses.find((h) => h.id === houseId);
    if (!house || house.занятость) return;
    state.selectedHouseId = houseId;
    state.selectionResetReason = '';
    renderAll();
  }
  
  function renderStorageAlert() {
    els.storageAlertBox.innerHTML = '';
    if (!state.storageWarning) return;
  
    const box = document.createElement('div');
    box.className = 'storage-alert';
    box.setAttribute('role', 'alert');
  
    const text = document.createElement('span');
    text.textContent = `⚠️ ${state.storageWarning}`;
  
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn btn-light';
    closeBtn.textContent = 'Понятно';
    closeBtn.addEventListener('click', () => {
      state.storageWarning = '';
      renderStorageAlert();
    });
  
    box.append(text, closeBtn);
    els.storageAlertBox.appendChild(box);
  }
  
  function renderHeaderStats() {
    const freeCount = state.houses.filter((h) => !h.занятость).length;
    els.headerStats.innerHTML = `Свободно домов: <strong>${freeCount} из ${state.houses.length}</strong>`;
  }
  
  function renderNotice() {
    els.filterNoticeBox.innerHTML = '';
    if (!state.selectionResetReason) return;
  
    const banner = document.createElement('div');
    banner.className = 'notice-banner';
  
    const text = document.createElement('span');
    text.textContent = state.selectionResetReason;
  
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-light';
    btn.textContent = 'Сбросить фильтры';
    btn.addEventListener('click', resetFilters);
  
    banner.append(text, btn);
    els.filterNoticeBox.appendChild(banner);
  }
  
  function parseStrictInt(rawValue) {
    const trimmed = String(rawValue).trim();
    if (!/^-?\d+$/.test(trimmed)) return NaN;
    return Number(trimmed);
  }
  
  function renderDetailsPanel() {
    els.detailsPanel.innerHTML = '';
    els.detailsPanel.classList.toggle('details-box--active', state.selectedHouseId !== null);
  
    if (state.selectedHouseId === null) {
      const box = document.createElement('div');
      box.style.margin = 'auto 0';
      box.style.textAlign = 'center';
  
      if (state.selectionResetReason) {
        const note = document.createElement('p');
        note.className = 'notice-banner';
        note.textContent = state.selectionResetReason;
        box.appendChild(note);
      }
  
      const title = document.createElement('h3');
      title.className = 'details-title';
      title.textContent = 'Дом не выбран';
  
      const hint = document.createElement('p');
      hint.className = 'muted';
      hint.textContent = 'Выберите свободный дом на схеме или в списке ниже (мышью или с клавиатуры), чтобы указать гостей, ночи и подтвердить бронь.';
  
      const demoNote = document.createElement('p');
      demoNote.className = 'demo-note';
      demoNote.textContent = 'Учебное демо, реальная бронь не оформляется';
  
      box.append(title, hint, demoNote);
      els.detailsPanel.appendChild(box);
      return;
    }
  
    const house = state.houses.find((h) => h.id === state.selectedHouseId);
    if (!house) return;
  
    const top = document.createElement('div');
  
    const badge = document.createElement('span');
    badge.className = 'status-pill status-pill--selected';
    badge.textContent = 'Выбран · Свободен';
  
    const title = document.createElement('h3');
    title.className = 'details-title';
    title.textContent = `Дом №${house.id} — ${house.название}`;
  
    const meta = document.createElement('div');
    meta.className = 'details-meta';
    meta.textContent = `📍 ${house.координатыНаСхеме.зона} · 👥 Вместимость: до ${house.вместимость} гостей`;
  
    const desc = document.createElement('p');
    desc.className = 'details-desc';
    desc.textContent = house.описание;
  
    top.append(badge, title, meta, desc);
  
    const bottom = document.createElement('div');
  
    const priceRow = document.createElement('div');
    priceRow.className = 'price-row';
    priceRow.innerHTML = `<span>Цена за ночь</span><strong>${formatPrice(house.ценаЗаНочь)} ₽</strong>`;
  
    const form = document.createElement('form');
    form.className = 'booking-form';
    form.noValidate = true;
  
    const initialGuests = Math.min(2, house.вместимость);
    const initialNights = 2;
  
    form.innerHTML = `
      <div class="booking-dates">
        <div class="field-group">
          <label for="bookingGuestsInput">Число гостей (от 1 до ${house.вместимость})</label>
          <input
            type="number"
            id="bookingGuestsInput"
            name="guests"
            min="1"
            max="${house.вместимость}"
            step="1"
            value="${initialGuests}"
          />
          <span class="field-error" id="guestsError" aria-live="polite"></span>
        </div>
  
        <div class="field-group">
          <label for="bookingNightsInput">Число ночей (от 1 до 30)</label>
          <input
            type="number"
            id="bookingNightsInput"
            name="nights"
            min="1"
            max="30"
            step="1"
            value="${initialNights}"
          />
          <span class="field-error" id="nightsError" aria-live="polite"></span>
        </div>
      </div>
  
      <div class="total-row" id="bookingTotalBox">
        <span>Итого (<span id="totalFormula">${formatPrice(house.ценаЗаНочь)} ₽ × ${initialNights} ноч.</span>)</span>
        <strong id="totalAmount">${formatPrice(house.ценаЗаНочь * initialNights)} ₽</strong>
      </div>
  
      <span class="field-error" id="formGlobalError" aria-live="polite"></span>
      <button type="submit" class="btn btn-primary" id="confirmBookingBtn">
        Подтвердить бронирование
      </button>
      <p class="demo-note">Учебное демо, реальная бронь не оформляется</p>
    `;
    const guestsInput = form.querySelector('#bookingGuestsInput');
  const nightsInput = form.querySelector('#bookingNightsInput');
  const guestsError = form.querySelector('#guestsError');
  const nightsError = form.querySelector('#nightsError');
  const formGlobalError = form.querySelector('#formGlobalError');
  const confirmBtn = form.querySelector('#confirmBookingBtn');
  const totalFormula = form.querySelector('#totalFormula');
  const totalAmount = form.querySelector('#totalAmount');

  function validateGuests() {
    const val = parseStrictInt(guestsInput.value);
    if (!Number.isInteger(val) || val < 1 || val > house.вместимость) {
      guestsInput.classList.add('input-invalid');
      guestsInput.setAttribute('aria-invalid', 'true');
      guestsError.textContent = `Укажите целое число от 1 до ${house.вместимость}.`;
      return null;
    }
    guestsInput.classList.remove('input-invalid');
    guestsInput.removeAttribute('aria-invalid');
    guestsError.textContent = '';
    return val;
  }

  function validateNights() {
    const val = parseStrictInt(nightsInput.value);
    if (!Number.isInteger(val) || val < 1 || val > 30) {
      nightsInput.classList.add('input-invalid');
      nightsInput.setAttribute('aria-invalid', 'true');
      nightsError.textContent = 'Укажите целое число от 1 до 30.';
      return null;
    }
    nightsInput.classList.remove('input-invalid');
    nightsInput.removeAttribute('aria-invalid');
    nightsError.textContent = '';
    return val;
  }

  function updateTotalPreview() {
    const validNights = validateNights();
    if (validNights !== null) {
      const sum = house.ценаЗаНочь * validNights;
      totalFormula.textContent = `${formatPrice(house.ценаЗаНочь)} ₽ × ${validNights} ноч.`;
      totalAmount.textContent = `${formatPrice(sum)} ₽`;
    } else {
      totalFormula.textContent = `${formatPrice(house.ценаЗаНочь)} ₽ × —`;
      totalAmount.textContent = '— ₽';
    }
  }

  guestsInput.addEventListener('input', validateGuests);
  nightsInput.addEventListener('input', updateTotalPreview);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (state.isSubmittingBooking) return;
    formGlobalError.textContent = '';

    const currentHouse = state.houses.find((h) => h.id === state.selectedHouseId);
    if (!currentHouse || currentHouse.занятость) {
      formGlobalError.textContent = 'Ошибка: дом не выбран или уже занят.';
      return;
    }

    const alreadyBooked = state.bookings.some((b) => b.houseId === currentHouse.id);
    if (alreadyBooked) {
      formGlobalError.textContent = 'Бронь на этот дом уже оформлена.';
      return;
    }

    const validGuests = validateGuests();
    const validNights = validateNights();
    if (validGuests === null || validNights === null) {
      return;
    }

    state.isSubmittingBooking = true;
    confirmBtn.disabled = true;

    const bookingNumber = `БР-${state.nextBookingNumber++}`;
    const totalPrice = currentHouse.ценаЗаНочь * validNights;

    state.bookings.push({
      bookingId: Date.now(),
      bookingNumber,
      houseId: currentHouse.id,
      houseName: `Дом №${currentHouse.id} — ${currentHouse.название}`,
      guestsCount: validGuests,
      nights: validNights,
      totalPrice
    });

    state.selectedHouseId = null;
    state.selectionResetReason = `Бронь ${bookingNumber} подтверждена: ${currentHouse.название} занят.`;
    saveAppState();
    syncOccupiedStatus();
    state.isSubmittingBooking = false;
    renderAll();
  });

  bottom.append(priceRow, form);
  els.detailsPanel.append(top, bottom);
}

function renderHousesList(filteredHouses) {
  els.housesCountLabel.textContent = `Показано: ${filteredHouses.length} из ${state.houses.length}`;
  els.housesList.innerHTML = '';

  if (filteredHouses.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-box';
    empty.innerHTML = `
      <h3>Подходящих домов не найдено</h3>
      <p>Попробуйте увеличить максимальную цену, уменьшить число гостей или сбросить фильтры.</p>
    `;

    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'btn btn-primary';
    resetBtn.style.width = 'auto';
    resetBtn.textContent = 'Сбросить фильтры';
    resetBtn.addEventListener('click', resetFilters);

    empty.appendChild(resetBtn);
    els.housesList.appendChild(empty);
    return;
  }

  filteredHouses.forEach((house) => {
    const isOccupied = house.занятость;
    const isSelected = !isOccupied && house.id === state.selectedHouseId;

    const card = document.createElement('article');
    card.className = 'house-card';

    let statusLabel = 'Свободен';
    if (isOccupied) {
      card.classList.add('house-card--occupied');
      card.setAttribute('aria-disabled', 'true');
      statusLabel = 'Занят';
    } else {
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-pressed', String(isSelected));
      if (isSelected) {
        card.classList.add('house-card--selected');
        statusLabel = 'Выбран';
      } else {
        card.classList.add('house-card--free');
      }
    }

    card.setAttribute(
      'aria-label',
      `Дом №${house.id}, ${house.название}, до ${house.вместимость} гостей, ${formatPrice(house.ценаЗаНочь)} рублей за ночь, статус: ${statusLabel}`
    );

    const header = document.createElement('div');
    header.className = 'house-card__header';

    const num = document.createElement('span');
    num.className = 'house-card__num';
    num.textContent = `Дом №${house.id}`;

    const pill = document.createElement('span');
    pill.className = 'status-pill';
    if (isOccupied) {
      pill.classList.add('status-pill--busy');
      pill.textContent = 'Занят';
    } else if (isSelected) {
      pill.classList.add('status-pill--selected');
      pill.textContent = 'Выбран';
    } else {
      pill.classList.add('status-pill--free');
      pill.textContent = 'Свободен';
    }

    header.append(num, pill);

    const title = document.createElement('h3');
    title.className = 'house-card__title';
    title.textContent = house.название;

    const meta = document.createElement('p');
    meta.className = 'house-card__meta';
    meta.textContent = `${house.координатыНаСхеме.зона} · до ${house.вместимость} гостей`;

    const footer = document.createElement('div');
    footer.className = 'house-card__footer';

    const price = document.createElement('span');
    price.className = 'house-card__price';
    price.innerHTML = `${formatPrice(house.ценаЗаНочь)} ₽ <small>/ ночь</small>`;

    const action = document.createElement('span');
    action.className = 'house-card__action';
    action.textContent = isOccupied ? 'Недоступен' : isSelected ? 'Выбран ✓' : 'Выбрать →';

    footer.append(price, action);
    card.append(header, title, meta, footer);

    if (!isOccupied) {
      card.addEventListener('click', () => selectHouse(house.id));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectHouse(house.id);
        }
      });
    }

    els.housesList.appendChild(card);
  });
}

function renderMyBookings() {
  els.bookingsCountBadge.textContent = String(state.bookings.length);
  els.myBookingsList.innerHTML = '';

  if (state.bookings.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent = 'У вас пока нет активных броней. Выберите свободный дом и нажмите «Подтвердить бронирование».';
    els.myBookingsList.appendChild(empty);
    return;
  }

  state.bookings.forEach((b) => {
    const item = document.createElement('div');
    item.className = 'booking-card';

    const info = document.createElement('div');
    info.innerHTML = `
      <span class="booking-num">${b.bookingNumber}</span>
      <h4>${b.houseName}</h4>
      <p>Гостей: <strong>${b.guestsCount}</strong> · Ночей: <strong>${b.nights}</strong></p>
      <p>Сумма: <strong>${formatPrice(b.totalPrice)} ₽</strong></p>
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn-danger';
    cancelBtn.textContent = 'Отменить бронь';
    cancelBtn.addEventListener('click', () => {
      state.bookings = state.bookings.filter((x) => x.bookingId !== b.bookingId);
      state.selectionResetReason = '';
      saveAppState();
      syncOccupiedStatus();
      renderAll();
    });

    item.append(info, cancelBtn);
    els.myBookingsList.appendChild(item);
  });
}

function renderAll() {
  const filtered = getFilteredHouses();
  const visibleIds = new Set(filtered.map((h) => h.id));

  if (state.selectedHouseId !== null && !visibleIds.has(state.selectedHouseId)) {
    const hidden = state.houses.find((h) => h.id === state.selectedHouseId);
    state.selectedHouseId = null;
    state.selectionResetReason = hidden
      ? `Выбор сброшен: дом №${hidden.id} («${hidden.название}») скрыт фильтрами.`
      : 'Выбор сброшен фильтрами.';
  }

  renderStorageAlert();
  renderHeaderStats();
  renderNotice();
  renderVillageMap(els.mapContainer, {
    houses: state.houses,
    selectedId: state.selectedHouseId,
    visibleIds,
    onSelectHouse: selectHouse
  });
  renderDetailsPanel();
  renderHousesList(filtered);
  renderMyBookings();
}

init();

