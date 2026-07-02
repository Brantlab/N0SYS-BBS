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
