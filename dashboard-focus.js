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
    const rankingGrid = document.querySelector(".leaderboard-grid");
    const joinPanel = document.querySelector(".join-panel");
    const rankingPanels = [...document.querySelectorAll(".leaderboard")].filter((panel) => panel.querySelector("ol"));

    function copyRanking(panel) {
      const list = panel.querySelector("ol").cloneNode(true);
      list.removeAttribute("id");
      list.className = "focus-ranking";
      list.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
      return list;
    }

    function render() {
      if (!activePanel) return;
      const scope = document.getElementById("class-filter").value || "全校總覽";
      dialog.classList.toggle("is-overview",activePanel === rankingGrid);
      if (activePanel === rankingGrid) {
        title.textContent = "排行榜總覽";
        caption.textContent = `${scope} · 四榜同步更新`;
        const grid = document.createElement("div");
        grid.className = "focus-overview-grid";
        rankingPanels.forEach((panel) => {
          const card = document.createElement("section");
          card.className = "focus-overview-card";
          const heading = document.createElement("h3");
          heading.textContent = panel.querySelector(".leaderboard-title strong").textContent;
          const description = document.createElement("p");
          description.textContent = panel.querySelector(".leaderboard-title span").textContent;
          card.append(heading,description,copyRanking(panel));
          grid.append(card);
        });
        body.replaceChildren(grid);
        return;
      }
      if (activePanel === joinPanel) {
        title.textContent = "掃碼加入討伐";
        caption.textContent = "使用裝置掃描二維碼，即可進入學生練習";
        const content = document.createElement("div");
        content.className = "focus-join";
        const qr = document.createElement("div");
        qr.className = "focus-qr";
        const source = document.getElementById("join-qr");
        const sourceImage = source.querySelector("img");
        const sourceCanvas = source.querySelector("canvas");
        if (sourceImage?.getAttribute("src")) {
          const image = document.createElement("img");
          image.src = sourceImage.src;
          image.alt = "學生練習頁二維碼";
          qr.append(image);
        } else if (sourceCanvas) {
          const canvas = document.createElement("canvas");
          canvas.width = sourceCanvas.width; canvas.height = sourceCanvas.height;
          canvas.getContext("2d").drawImage(sourceCanvas,0,0);
          canvas.setAttribute("aria-label","學生練習頁二維碼");
          qr.append(canvas);
        } else qr.textContent = "二維碼載入中，亦可使用下方連結";
        const link = document.getElementById("student-link").cloneNode(true);
        link.removeAttribute("id");
        content.append(qr,link);
        body.replaceChildren(content);
        return;
      }
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
      body.replaceChildren(copyRanking(activePanel));
    }

    const overviewButton = document.createElement("button");
    overviewButton.type = "button";
    overviewButton.id = "rankings-overview-button";
    overviewButton.className = "dashboard-overview-button";
    overviewButton.textContent = "排行榜總覽";
    overviewButton.setAttribute("aria-haspopup","dialog");
    overviewButton.addEventListener("click", () => {
      activePanel = rankingGrid; opener = overviewButton; render();
      if (!dialog.open) dialog.showModal();
    });
    document.getElementById("fullscreen-button").before(overviewButton);

    rankingPanels.forEach((panel) => {
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
      new MutationObserver(() => { if (dialog.open && (activePanel === panel || activePanel === rankingGrid)) render(); })
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
    if (joinPanel) {
      const heading = joinPanel.querySelector(".panel-heading");
      const button = document.createElement("button");
      button.type = "button"; button.className = "focus-trigger";
      button.setAttribute("aria-haspopup","dialog");
      button.setAttribute("aria-label","顯示加入討伐二維碼");
      button.append(...heading.childNodes); heading.append(button);
      joinPanel.classList.add("focus-clickable");
      joinPanel.addEventListener("click", (event) => {
        if (event.target.closest("a")) return;
        activePanel = joinPanel; opener = button; render();
        if (!dialog.open) dialog.showModal();
      });
      new MutationObserver(() => { if (dialog.open && activePanel === joinPanel) render(); })
        .observe(document.getElementById("join-qr"),{childList:true,subtree:true,attributes:true,attributeFilter:["src"]});
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
