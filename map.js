export function renderVillageMap(container, { houses, selectedId, visibleIds, onSelectHouse }) {
    const svgNS = 'http://w3.org';
  
    const trees = [,,,,
  ,,,,
  ,,,
    ];
  
    const treesMarkup = trees
      .map(
        ([tx, ty]) => `
        <g transform="translate(${tx}, ${ty})" opacity="0.9">
          <polygon points="0,-18 -11,4 11,4" fill="#1f9d5d"/>
          <polygon points="0,-10 -14,14 14,14" fill="#16794a"/>
          <rect x="-2" y="14" width="4" height="6" fill="#6b4423"/>
        </g>`
      )
      .join('');
  
    const housePinsMarkup = houses
      .map((house) => {
        const { x, y } = house.координатыНаСхеме;
        const isVisible = visibleIds.has(house.id);
  
        if (!isVisible) {
          return `
            <g transform="translate(${x}, ${y})" opacity="0.45">
              <ellipse cx="0" cy="8" rx="22" ry="12" fill="none" stroke="#6d8774" stroke-width="1.5" stroke-dasharray="4 4" />
              <text x="0" y="11" text-anchor="middle" font-size="9" fill="#4e6156">№${house.id}</text>
            </g>
          `;
        }
  
        const isSelected = house.id === selectedId;
        const isOccupied = house.занятость;
  
        let statusText = 'Свободен';
        let roofColor = '#16794a';
        let bodyFill = '#ffffff';
        let badgeBg = '#dcf5e7';
        let badgeTextColor = '#0e5835';
        let stateClass = 'house-pin--free';
  
        if (isOccupied) {
          statusText = 'Занят';
          roofColor = '#c93838';
          bodyFill = '#fdeaea';
          badgeBg = '#fde4e4';
          badgeTextColor = '#9b2424';
          stateClass = 'house-pin--occupied';
        } else if (isSelected) {
          statusText = 'Выбран';
          roofColor = '#f06418';
          bodyFill = '#fff5ee';
          badgeBg = '#f06418';
          badgeTextColor = '#ffffff';
          stateClass = 'house-pin--selected';
        }
  
        return `
          <g
            class="house-pin ${stateClass}"
            data-house-id="${house.id}"
            data-occupied="${isOccupied}"
            transform="translate(${x}, ${y})"
            role="button"
            tabindex="${isOccupied ? '-1' : '0'}"
            aria-disabled="${isOccupied}"
            aria-label="Дом №${house.id}: ${house.название}, статус: ${statusText}"
          >
            ${isSelected && !isOccupied ? `<circle class="house-pin__pulse" cx="0" cy="0" r="25" />` : ''}
  
            <ellipse cx="0" cy="19" rx="23" ry="7" fill="rgba(20, 45, 30, 0.24)" />
  
            <rect
              x="-17"
              y="-4"
              width="34"
              height="21"
              rx="4"
              fill="${bodyFill}"
              stroke="${roofColor}"
              stroke-width="${isSelected ? 3.2 : 2.3}"
            />
  
            <polygon
              class="house-pin__roof"
              points="0,-21 -22,-2 22,-2"
              fill="${roofColor}"
            />
  
            <text
              x="0"
              y="10"
              text-anchor="middle"
              font-size="11"
              font-weight="800"
              fill="${isOccupied ? '#8f2929' : '#14211a'}"
            >№${house.id}</text>
  
            <g transform="translate(0, 33)">
              <rect
                x="-34"
                y="-10"
                width="68"
                height="18"
                rx="9"
                fill="${badgeBg}"
                stroke="${roofColor}"
                stroke-width="1.3"
              />
              <text
                x="0"
                y="2.5"
                text-anchor="middle"
                font-size="9.5"
                font-weight="800"
                fill="${badgeTextColor}"
              >${statusText}</text>
            </g>
          </g>
        `;
      })
      .join('');
  
    container.innerHTML = `
      <svg class="village-svg" viewBox="0 0 820 500" xmlns="${svgNS}">
        <defs>
          <linearGradient id="lakeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
          <linearGradient id="meadowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#dcfce7" />
            <stop offset="100%" stop-color="#bbf7d0" />
          </linearGradient>
        </defs>
  
        <rect width="820" height="500" fill="url(#meadowGrad)" />
  
        <path
          d="M 80,0 L 760,0 C 770,55 710,95 620,105 C 510,118 460,82 355,88 C 250,94 185,125 110,95 C 65,77 65,30 80,0 Z"
          fill="url(#lakeGrad)"
        />
        <path d="M 220,42 Q 260,36 300,42" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M 480,55 Q 535,48 585,55" stroke="rgba(255,255,255,0.6)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <text x="415" y="46" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="800" letter-spacing="3">
          ЛЕСНОЕ ОЗЕРО
        </text>
  
        <rect x="347" y="84" width="16" height="28" rx="2" fill="#b45309" />
        <line x1="347" y1="92" x2="363" y2="92" stroke="#78350f" stroke-width="1.5"/>
        <line x1="347" y1="100" x2="363" y2="100" stroke="#78350f" stroke-width="1.5"/>
  
        <path
          d="M 820,285 L 610,285 C 470,285 360,295 220,290 C 145,287 115,260 115,215"
          fill="none"
          stroke="#fed7aa"
          stroke-width="26"
          stroke-linecap="round"
        />
        <path
          d="M 820,285 L 610,285 C 470,285 360,295 220,290 C 145,287 115,260 115,215"
          fill="none"
          stroke="#fff7ed"
          stroke-width="2"
          stroke-dasharray="8 8"
          stroke-linecap="round"
        />
        <text x="745" y="266" fill="#9a3412" font-size="11" font-weight="700">Въезд →</text>
  
        ${treesMarkup}
        ${housePinsMarkup}
      </svg>
    `;
  
    container.querySelectorAll('.house-pin').forEach((pin) => {
      const isOccupied = pin.dataset.occupied === 'true';
      if (isOccupied) return;
  
      const selectHandler = () => {
        onSelectHouse(Number(pin.dataset.houseId));
      };
  
      pin.addEventListener('click', selectHandler);
      pin.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectHandler();
        }
      });
    });
  }
  
  
  