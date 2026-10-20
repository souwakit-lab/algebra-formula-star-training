window.GENERAL_TERM_CONFIG = {
  apiUrl: location.hostname === "127.0.0.1" || location.hostname === "localhost"
    ? ""
    : "https://script.google.com/macros/s/AKfycbxSTZ1HgFexPUhqhPJxwvVynAHVTgkenz99--21PEi2GKPs6beia2TMgAY3KirvSlQgnA/exec",
  studentUrl: location.hostname === "127.0.0.1" || location.hostname === "localhost"
    ? new URL("index.html", location.href).href
    : "https://souwakit-lab.github.io/general-term-formula-game/",
};
