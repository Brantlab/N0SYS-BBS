(() => {
  const clock = document.querySelector("#utc-clock");
  if (!clock) return;

  const updateClock = () => {
    const now = new Date();
    clock.dateTime = now.toISOString();
    clock.textContent = `${now.toISOString().slice(11, 19)} UTC`;
  };

  updateClock();
  window.setInterval(updateClock, 1000);
})();

