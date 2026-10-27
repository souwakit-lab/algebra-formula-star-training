/* Accessible, live-updating presentation views for the teacher dashboard. */
(() => {
  function init() {
    const dialog = document.createElement("dialog");
    dialog.className = "dashboard-focus-dialog";
    dialog.setAttribute("aria-labelledby", "focus-title");
    dialog.innerHTML = '<header class="focus-header"><div><h2 id="focus-title"></h2><p id="focus-caption"></p></div><button type="button" class="focus-close" aria-label="關閉放大視窗">×</button></header><div class="focus-body"></div>';
    document.body.append(dialog);
    const title = dialog.querySelector("h2");
    const caption = dialog.querySelector("p");
    const body = dialog.querySelector(".focus-body");
    let activePanel = null;
    let opener = null;

    function render() {
      if (!activePanel) return;
      const scope = document.getElementById("class-filter").value || "全校總覽";
      if (activePanel.classList.contains("tier-panel")) {
        title.textContent = "全班戰鬥等級";
        caption.textContent = `${scope} · 各級別學生名單`;
        const groups = document.createElement("div");
        groups.className = "focus-tier-grid";
        const players = latestData.players || [];
        activePanel.querySelectorAll(".tier-row").forEach((row,index) => {
          const level = index + 1;
          const members = players.filter((player) => Number(player.level) === level)
            .sort((a,b) => String(a.className || "").localeCompare(String(b.className || "")) || Number(a.id || 0)-Number(b.id || 0));
          const group = document.createElement("section");
          group.className = "focus-tier-group";
          const heading = document.createElement("h3");
          heading.textContent = `Level ${level} · ${members.length} 人`;
          const roster = document.createElement("div");
          roster.className = "focus-roster";
          if (!members.length) roster.textContent = "暫無學生";
          members.forEach((player) => {
            const name = document.createElement("div");
            name.className = "focus-student";
            const label = document.createElement("strong");
            label.textContent = player.name || "未命名";
            const details = document.createElement("small");
            details.textContent = [player.className, player.id ? `${player.id} 號` : ""].filter(Boolean).join(" · ");
            name.append(label,details);
            roster.append(name);
          });
          group.append(heading,roster);
          groups.append(group);
        });
        body.replaceChildren(groups);
        return;
      }
      title.textContent = activePanel.querySelector(".leaderboard-title strong").textContent;
      caption.textContent = `${scope} · ${activePanel.querySelector(".leaderboard-title span").textContent}`;
      const list = activePanel.querySelector("ol").cloneNode(true);
      list.removeAttribute("id");
      list.className = "focus-ranking";
      list.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      body.replaceChildren(list);
    }

    document.querySelectorAll(".leaderboard").forEach((panel) => {
      if (!panel.querySelector("ol")) return;
      const heading = panel.querySelector(".leaderboard-title");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "focus-trigger";
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-label", `放大顯示${heading.querySelector("strong").textContent}`);
      button.append(...heading.childNodes);
      heading.append(button);
      panel.classList.add("focus-clickable");
      panel.addEventListener("click", () => {
        activePanel = panel;
        opener = button;
        render();
        if (!dialog.open) dialog.showModal();
      });
      new MutationObserver(() => { if (dialog.open && activePanel === panel) render(); })
        .observe(panel.querySelector("ol"), {childList:true,subtree:true,characterData:true});
    });
    const tierPanel = document.querySelector(".tier-panel");
    if (tierPanel) {
      const label = tierPanel.querySelector(".panel-heading strong");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "focus-trigger";
      button.setAttribute("aria-haspopup","dialog");
      button.setAttribute("aria-label","查看各級別學生姓名");
      label.before(button);
      button.append(label);
      tierPanel.classList.add("focus-clickable");
      tierPanel.addEventListener("click", () => {
        activePanel = tierPanel; opener = button; render();
        if (!dialog.open) dialog.showModal();
      });
      new MutationObserver(() => { if (dialog.open && activePanel === tierPanel) render(); })
        .observe(tierPanel,{childList:true,subtree:true,characterData:true});
    }
    dialog.querySelector(".focus-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      const bounds = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
    });
    dialog.addEventListener("close", () => { activePanel = null; opener?.focus(); });
  }
  document.addEventListener("DOMContentLoaded", init);
})();
