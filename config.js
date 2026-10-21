window.GENERAL_TERM_CONFIG = {
  apiUrl: location.hostname === "127.0.0.1" || location.hostname === "localhost"
    ? ""
    : "https://script.google.com/macros/s/AKfycbxPseNyzp9Kn9Kb2Y3ZF-tTv1MzC969UhGbsfuFUZ9iUWl4tir7Da0UP27_TMARbqU4/exec",
  studentUrl: location.hostname === "127.0.0.1" || location.hostname === "localhost"
    ? new URL("index.html", location.href).href
    : "https://souwakit-lab.github.io/algebra-formula-star-training/",
};
window.SIMPLIFY_CONFIG = {
  apiUrl: window.GENERAL_TERM_CONFIG.apiUrl,
  studentUrl: location.hostname === "127.0.0.1" || location.hostname === "localhost" ? new URL("simplify.html", location.href).href : "https://souwakit-lab.github.io/algebra-formula-star-training/simplify.html",
};
window.NTH_TERM_CONFIG = {
  apiUrl: window.GENERAL_TERM_CONFIG.apiUrl,
  studentUrl: new URL("nth-term.html", location.href).href,
};
