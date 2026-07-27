(() => {
  const clock = document.querySelector("#utc-clock");
  if (clock) {
    const updateClock = () => {
      const now = new Date();
      clock.dateTime = now.toISOString();
      clock.textContent = `${now.toISOString().slice(11, 19)} UTC`;
    };

    updateClock();
    window.setInterval(updateClock, 1000);
  }

  const postImages = document.querySelectorAll(".prose img");
  if (postImages.length) {
    const lightbox = document.createElement("div");
    lightbox.className = "image-lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Expanded image");

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close expanded image");
    closeButton.textContent = "X";

    const expandedImage = document.createElement("img");
    expandedImage.alt = "";

    lightbox.append(closeButton, expandedImage);
    document.body.append(lightbox);

    const closeLightbox = () => {
      lightbox.hidden = true;
      expandedImage.removeAttribute("src");
    };

    postImages.forEach((image) => {
      image.tabIndex = 0;
      image.setAttribute("role", "button");
      image.setAttribute("aria-label", `Expand image: ${image.alt || "post image"}`);

      const openLightbox = () => {
        expandedImage.src = image.currentSrc || image.src;
        expandedImage.alt = image.alt;
        lightbox.hidden = false;
        closeButton.focus();
      };

      image.addEventListener("click", openLightbox);
      image.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openLightbox();
        }
      });
    });

    closeButton.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !lightbox.hidden) closeLightbox();
    });
  }

  const gridToLatLon = (grid) => {
    const value = String(grid || "").trim().toUpperCase();
    if (value.length < 4) return null;

    let lon = (value.charCodeAt(0) - 65) * 20 - 180;
    let lat = (value.charCodeAt(1) - 65) * 10 - 90;
    lon += Number(value[2]) * 2;
    lat += Number(value[3]);

    let lonSize = 2;
    let latSize = 1;

    if (value.length >= 6) {
      lon += (value.charCodeAt(4) - 65) * (5 / 60);
      lat += (value.charCodeAt(5) - 65) * (2.5 / 60);
      lonSize = 5 / 60;
      latSize = 2.5 / 60;
    }

    return {
      lat: lat + latSize / 2,
      lon: lon + lonSize / 2
    };
  };

  const renderQsoMap = (container) => {
    const dataNode = container.querySelector('script[type="application/json"]');
    if (!dataNode) return;

    let contacts;
    try {
      contacts = JSON.parse(dataNode.textContent);
    } catch (error) {
      console.error(error);
      return;
    }

    const home = gridToLatLon(container.dataset.homeGrid);
    if (!home) return;

    const plotted = contacts
      .map((contact) => ({ ...contact, position: gridToLatLon(contact.grid) }))
      .filter((contact) => contact.position);

    if (!plotted.length) return;

    const bounds = {
      minLat: -90,
      maxLat: 90,
      minLon: -180,
      maxLon: 180
    };

    const width = 780;
    const height = 430;
    const padding = 44;
    const x = (lon) => padding + ((lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * (width - padding * 2);
    const y = (lat) => padding + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * (height - padding * 2);
    const escape = (text) => String(text || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

    const gridLines = [];
    for (let lon = Math.ceil(bounds.minLon / 20) * 20; lon < bounds.maxLon; lon += 20) {
      gridLines.push(`<line class="map-gridline" x1="${x(lon).toFixed(1)}" y1="${padding}" x2="${x(lon).toFixed(1)}" y2="${height - padding}" />`);
    }
    for (let lat = Math.ceil(bounds.minLat / 10) * 10; lat < bounds.maxLat; lat += 10) {
      gridLines.push(`<line class="map-gridline" x1="${padding}" y1="${y(lat).toFixed(1)}" x2="${width - padding}" y2="${y(lat).toFixed(1)}" />`);
    }

    const homeX = x(home.lon);
    const homeY = y(home.lat);
    const paths = plotted.map((contact) => {
      const contactX = x(contact.position.lon);
      const contactY = y(contact.position.lat);
      return `<line class="map-path" x1="${homeX.toFixed(1)}" y1="${homeY.toFixed(1)}" x2="${contactX.toFixed(1)}" y2="${contactY.toFixed(1)}" />`;
    }).join("");

    const markers = plotted.map((contact, index) => {
      const contactX = x(contact.position.lon);
      const contactY = y(contact.position.lat);
      const labelOffsetX = contactX > width - 160 ? -82 : 9;
      const labelOffsetY = contactY < 66 ? 18 + (index % 3) * 14 : -8 + (index % 3) * 14;
      const label = `${contact.call} ${contact.band}`;
      const detail = `${contact.call} ${contact.band} ${contact.mode} ${contact.grid}${contact.estimated ? " estimated" : ""} ${contact.distanceMi} mi`;
      return `
        <g class="map-contact" tabindex="0" role="listitem" aria-label="${escape(detail)}" data-map-x="${contactX.toFixed(1)}" data-map-y="${contactY.toFixed(1)}">
          <title>${escape(detail)}</title>
          <g class="map-contact-scale">
            <circle class="map-point map-band-${escape(contact.band)}" cx="0" cy="0" r="4.8" />
            <rect class="map-label-bg" x="${labelOffsetX}" y="${labelOffsetY - 11}" width="${Math.max(58, label.length * 7)}" height="15" />
            <text class="map-label" x="${labelOffsetX + 4}" y="${labelOffsetY}">${escape(label)}</text>
          </g>
        </g>`;
    }).join("");

    const omitted = contacts.length - plotted.length;
    const note = omitted ? `${plotted.length} plotted from grid squares; ${omitted} contact missing grid` : `${plotted.length} contacts plotted from grid squares`;
    const clipId = `qso-map-frame-${Math.random().toString(36).slice(2)}`;

    container.innerHTML = `
      <div class="qso-map-controls" aria-label="Map controls">
        <button type="button" data-map-zoom="in" aria-label="Zoom in">+</button>
        <button type="button" data-map-zoom="out" aria-label="Zoom out">-</button>
        <button type="button" data-map-zoom="reset" aria-label="Reset map view">0</button>
      </div>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Map of logged HF contacts from ${escape(container.dataset.homeLabel || "home")} with world outline">
        <defs>
          <clipPath id="${clipId}">
            <rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${height - padding * 2}" />
          </clipPath>
        </defs>
        <rect class="map-frame" x="${padding}" y="${padding}" width="${width - padding * 2}" height="${height - padding * 2}" />
        <g clip-path="url(#${clipId})">
          <image class="map-world" href="/images/world-outline.svg" x="0" y="0" width="${width}" height="${height}" />
          ${gridLines.join("")}
          ${paths}
        </g>
        <text class="map-title" x="${padding}" y="24">HF CONTACT MAP</text>
        <text class="map-note" x="${padding}" y="${height - 14}">${escape(note)}</text>
        <g class="map-home-contact" data-map-x="${homeX.toFixed(1)}" data-map-y="${homeY.toFixed(1)}">
          <title>${escape(container.dataset.homeLabel || "Home")} ${escape(container.dataset.homeGrid)}</title>
          <g class="map-contact-scale">
            <circle class="map-home" cx="0" cy="0" r="6" />
            <text class="map-label" x="10" y="4">${escape(container.dataset.homeLabel || "HOME")}</text>
          </g>
        </g>
        ${markers}
      </svg>`;

    const svg = container.querySelector("svg");
    const view = {
      x: 0,
      y: 0,
      width,
      height
    };
    const minWidth = width / 6;
    const minHeight = height / 6;
    const setViewBox = () => {
      view.width = Math.min(width, Math.max(minWidth, view.width));
      view.height = Math.min(height, Math.max(minHeight, view.height));
      view.x = Math.min(width - view.width, Math.max(0, view.x));
      view.y = Math.min(height - view.height, Math.max(0, view.y));
      svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.width} ${view.height}`);
      const markerScale = Math.max(0.22, Math.min(1, (view.width / width) ** 1.45));
      container.querySelectorAll(".map-contact, .map-home-contact").forEach((contact) => {
        const contactX = Number(contact.dataset.mapX);
        const contactY = Number(contact.dataset.mapY);
        const scaled = contact.querySelector(".map-contact-scale");
        contact.setAttribute("transform", `translate(${contactX} ${contactY})`);
        scaled.setAttribute("transform", `scale(${markerScale})`);
      });
    };
    const svgPoint = (event) => {
      const rect = svg.getBoundingClientRect();
      return {
        x: view.x + ((event.clientX - rect.left) / rect.width) * view.width,
        y: view.y + ((event.clientY - rect.top) / rect.height) * view.height
      };
    };
    const zoomAt = (factor, point = { x: view.x + view.width / 2, y: view.y + view.height / 2 }) => {
      const nextWidth = view.width * factor;
      const nextHeight = view.height * factor;
      const rx = (point.x - view.x) / view.width;
      const ry = (point.y - view.y) / view.height;
      view.x = point.x - nextWidth * rx;
      view.y = point.y - nextHeight * ry;
      view.width = nextWidth;
      view.height = nextHeight;
      setViewBox();
    };
    const resetView = () => {
      view.x = 0;
      view.y = 0;
      view.width = width;
      view.height = height;
      setViewBox();
    };
    setViewBox();

    container.querySelectorAll("[data-map-zoom]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.mapZoom;
        if (action === "in") zoomAt(0.72);
        else if (action === "out") zoomAt(1.28);
        else resetView();
      });
    });

    svg.addEventListener("wheel", (event) => {
      event.preventDefault();
      zoomAt(event.deltaY < 0 ? 0.82 : 1.18, svgPoint(event));
    }, { passive: false });

    let panStart = null;
    svg.addEventListener("pointerdown", (event) => {
      panStart = {
        clientX: event.clientX,
        clientY: event.clientY,
        x: view.x,
        y: view.y
      };
      svg.setPointerCapture(event.pointerId);
      svg.classList.add("is-panning");
    });
    svg.addEventListener("pointermove", (event) => {
      if (!panStart) return;
      const rect = svg.getBoundingClientRect();
      view.x = panStart.x - ((event.clientX - panStart.clientX) / rect.width) * view.width;
      view.y = panStart.y - ((event.clientY - panStart.clientY) / rect.height) * view.height;
      setViewBox();
    });
    const stopPan = (event) => {
      panStart = null;
      svg.classList.remove("is-panning");
      if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
    };
    svg.addEventListener("pointerup", stopPan);
    svg.addEventListener("pointercancel", stopPan);

    container.querySelectorAll(".map-contact").forEach((contact) => {
      const liftContact = () => contact.parentNode.appendChild(contact);
      contact.addEventListener("pointerenter", liftContact);
      contact.addEventListener("focus", liftContact);
    });
  };

  document.querySelectorAll(".qso-map").forEach(renderQsoMap);

  const form = document.querySelector("#search-form");
  const input = document.querySelector("#search-query");
  const output = document.querySelector("#search-output");
  const results = document.querySelector("#search-results");
  const status = document.querySelector("#search-status");

  if (!form || !input || !output || !results || !status) return;

  let messages;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const showMessage = (text) => {
    results.replaceChildren(element("p", "empty", text));
  };

  const renderResults = (matches) => {
    if (!matches.length) {
      status.textContent = "0 messages found";
      showMessage("NO MATCHING TRAFFIC IN THE MESSAGE BASE.");
      return;
    }

    status.textContent = `${matches.length} message${matches.length === 1 ? "" : "s"} found`;
    const fragment = document.createDocumentFragment();

    matches.forEach((message, index) => {
      const row = element("article", "message-row");
      const link = element("a", "message-link");
      link.href = message.permalink;
      link.setAttribute("aria-label", `Read ${message.title}`);
      link.append(
        element("span", "message-number", String(index + 1).padStart(3, "0")),
        element("span", "message-date", message.displayDate),
        element("span", "message-board", `[${message.board}]`),
        element("span", "message-title", message.title),
        element("span", "message-from", message.callsign)
      );
      row.append(link);
      fragment.append(row);
    });

    results.replaceChildren(fragment);
  };

  const loadIndex = async () => {
    if (messages) return messages;
    const response = await fetch(output.dataset.indexUrl);
    if (!response.ok) throw new Error(`Index request failed: ${response.status}`);
    messages = await response.json();
    return messages;
  };

  const search = async () => {
    const query = input.value.trim();
    const url = new URL(window.location.href);

    if (query) url.searchParams.set("q", query);
    else url.searchParams.delete("q");
    window.history.replaceState({}, "", url);

    if (query.length < 2) {
      status.textContent = "Awaiting query";
      showMessage(query ? "TRANSMIT AT LEAST 2 CHARACTERS." : "ENTER SEARCH TERMS TO SCAN THE MESSAGE BASE.");
      return;
    }

    status.textContent = "Scanning message base...";

    try {
      const index = await loadIndex();
      const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const matches = index
        .map((message) => {
          const title = `${message.title} ${message.subject}`.toLocaleLowerCase();
          const metadata = `${message.callsign} ${message.board} ${(message.tags || []).join(" ")}`.toLocaleLowerCase();
          const body = `${message.summary} ${message.content}`.toLocaleLowerCase();
          const searchable = `${title} ${metadata} ${body}`;

          if (!terms.every((term) => searchable.includes(term))) return null;

          const score = terms.reduce((total, term) => {
            if (title.includes(term)) total += 8;
            if (metadata.includes(term)) total += 4;
            if (body.includes(term)) total += 1;
            return total;
          }, 0);

          return { ...message, score };
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));

      renderResults(matches);
    } catch (error) {
      console.error(error);
      status.textContent = "Index unavailable";
      showMessage("UNABLE TO READ MESSAGE INDEX. TRY AGAIN LATER.");
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    search();
  });

  let debounce;
  input.addEventListener("input", () => {
    window.clearTimeout(debounce);
    debounce = window.setTimeout(search, 180);
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target.matches("input, textarea, [contenteditable='true']");

    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      input.focus();
    } else if (event.key === "Escape" && document.activeElement === input) {
      input.value = "";
      search();
    }
  });

  const initialQuery = new URLSearchParams(window.location.search).get("q");
  if (initialQuery) {
    input.value = initialQuery;
    search();
  }
})();
