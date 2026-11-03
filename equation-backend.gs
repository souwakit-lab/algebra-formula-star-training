const EQUATION_PLAYER_SHEET="一元一次方程學生進度";
const EQUATION_ANSWER_SHEET="一元一次方程作答紀錄";
const EQUATION_CLASS_SHEET="一元一次方程班級狀態";
const EQUATION_BOSS_HP=300000;

function routeEquationGet_(e) {
  const action=String(e.parameter.action||""),className=e.parameter.className||"";
  if(action==="loadEquationPlayer")return loadEquationPlayer_(className,e.parameter.id);
  if(action==="getEquationDashboardData")return getCachedEquationDashboardData_(className);
  if(action==="getEquationExportData")return getEquationExportData_(className);
  if(action==="getEquationStudentExportData")return getEquationStudentExportData_(className,e.parameter.id);
  if(action==="getEquationSyncStatus")return {ok:true,received:JSON.parse(PropertiesService.getScriptProperties().getProperty(equationReceiptKey_(className,e.parameter.id))||"[]").includes(String(e.parameter.batchId||""))};
  return null;
}

function routeEquationPost_(e,payload) {
  const action=String(e.parameter.action||"");
  if(action==="resetEquation"){
    const className=String(payload.className||"");
    if(className&&!RATIONAL_CLASSES.includes(className))throw new Error("Invalid class");
    resetEquationData_(ensureEquationSheets_(spreadsheet_()),className);clearEquationDashboardCache_(className);
    return {ok:true};
  }
  if(action!=="saveEquation")return null;
  validateRationalPayload_(payload);
  if(!payload.batchId||typeof payload.batchId!=="string")throw new Error("Missing batch receipt");
  const receipts=PropertiesService.getScriptProperties(),key=equationReceiptKey_(payload.className,payload.id);
  const received=JSON.parse(receipts.getProperty(key)||"[]");
  if(received.includes(payload.batchId))return {ok:true,duplicate:true};
  const sheets=ensureEquationSheets_(spreadsheet_());
  saveEquationPlayer_(sheets.player,payload);appendEquationAnswers_(sheets.answer,payload);
  const correct=(Array.isArray(payload.answers)?payload.answers.slice(0,10):[]).filter(answer=>answer.isCorrect).length;
  updateEquationBoss_(sheets.classState,payload.className,correct*45);
  SpreadsheetApp.flush();clearEquationDashboardCache_(payload.className);
  receipts.setProperty(key,JSON.stringify([...received,payload.batchId].slice(-100)));
  return {ok:true};
}

function ensureEquationSheets_(spreadsheet) {
  let player = spreadsheet.getSheetByName(EQUATION_PLAYER_SHEET);
  let answer = spreadsheet.getSheetByName(EQUATION_ANSWER_SHEET);
  let classState = spreadsheet.getSheetByName(EQUATION_CLASS_SHEET);
  if (!player) {
    player = spreadsheet.insertSheet(EQUATION_PLAYER_SHEET);
    player.appendRow(["班別", "學號", "姓名", "程度", "經驗", "作答數", "答對數", "連勝", "連錯", "最後上線"]);
    player.setFrozenRows(1);
  }
  if (!answer) {
    answer = spreadsheet.insertSheet(EQUATION_ANSWER_SHEET);
    answer.appendRow(["時間", "班別", "學號", "姓名", "程度", "題目", "學生答案", "正確答案", "是否正確"]);
    answer.setFrozenRows(1);
  }
  if (!classState) {
    classState = spreadsheet.insertSheet(EQUATION_CLASS_SHEET);
    classState.appendRow(["班別", "首領能量", "能量上限", "最後更新"]);
    RATIONAL_CLASSES.forEach((className) => classState.appendRow([className, EQUATION_BOSS_HP, EQUATION_BOSS_HP, new Date()]));
    classState.setFrozenRows(1);
  }
  return { player, answer, classState };
}

function equationReceiptKey_(className, id) {
  if (!RATIONAL_CLASSES.includes(className) || !Number.isInteger(Number(id)) || Number(id) < 1 || Number(id) > 34 || (className === "SG1B" && Number(id) === 29)) throw new Error("Invalid student");
  return `equation-receipts:${className}:${Number(id)}`;
}

function loadEquationPlayer_(className, studentId) {
  if (!RATIONAL_CLASSES.includes(className)) throw new Error("Invalid class");
  const sheets = ensureEquationSheets_(spreadsheet_());
  const id = Number(studentId);
  const row = dataRows_(sheets.player, 10).find((item) => item[0] === className && Number(item[1]) === id);
  const answerRows = dataRows_(sheets.answer, 9).filter((item) => item[1] === className && Number(item[2]) === id);
  const classRow = dataRows_(sheets.classState, 4).find((item) => item[0] === className);
  const state = equationStateValues_(classRow);
  return {
    player: row ? rationalPlayerFromRow_(row) : null,
    levelStats: equationLevelStats_(answerRows),
    bossHp: state.bossHp,
    bossMaxHp: state.bossMaxHp,
  };
}

function getEquationDashboardData_(className) {
  if (className && !RATIONAL_CLASSES.includes(className)) throw new Error("Invalid class");
  const sheets = ensureEquationSheets_(spreadsheet_());
  const players = dataRows_(sheets.player, 10)
    .filter((row) => !className || row[0] === className)
    .map(rationalPlayerFromRow_);
  const states = dataRows_(sheets.classState, 4)
    .filter((row) => !className || row[0] === className)
    .map(equationStateValues_);
  const answerRows = dataRows_(sheets.answer, 9).filter((row) => !className || row[1] === className);
  return {
    players,
    levelStats: [1,2,3,4,5].map((level) => {
      const result = { level, total:0, correct:0, accuracy:0 };
      players.forEach((player) => {
        const stats = equationStudentStats_(player.className, player.id, answerRows.filter((row) => row[1] === player.className && Number(row[2]) === player.id));
        result.total += stats[level - 1].total; result.correct += stats[level - 1].correct;
      });
      result.accuracy = result.total ? result.correct / result.total : 0; return result;
    }),
    bossHp: states.reduce((sum, state) => sum + state.bossHp, 0),
    bossMaxHp: states.reduce((sum, state) => sum + state.bossMaxHp, 0) || EQUATION_BOSS_HP,
  };
}

function getCachedEquationDashboardData_(className) {
  const cache = CacheService.getScriptCache();
  const key = equationDashboardCacheKey_(className);
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  const data = getEquationDashboardData_(className);
  cache.put(key, JSON.stringify(data), DASHBOARD_CACHE_SECONDS);
  return data;
}

function getEquationExportData_(className) {
  if (className && !RATIONAL_CLASSES.includes(className)) throw new Error("Invalid class");
  const sheets = ensureEquationSheets_(spreadsheet_());
  const players = dataRows_(sheets.player, 10)
    .filter((row) => !className || row[0] === className)
    .map(rationalPlayerFromRow_);
  const answers = dataRows_(sheets.answer, 9)
    .filter((row) => !className || row[1] === className)
    .map(equationAnswerFromRow_);
  return { players, answers };
}

function getEquationStudentExportData_(className, studentId) {
  if (!RATIONAL_CLASSES.includes(className)) throw new Error("Invalid class");
  const id = Number(studentId);
  if (!Number.isInteger(id) || id < 1 || id > 34 || (className === "SG1B" && id === 29)) throw new Error("Invalid student id");
  const sheets = ensureEquationSheets_(spreadsheet_());
  const row = dataRows_(sheets.player, 10).find((item) => item[0] === className && Number(item[1]) === id);
  const answerRows = dataRows_(sheets.answer, 9).filter((item) => item[1] === className && Number(item[2]) === id);
  return {
    player: row ? rationalPlayerFromRow_(row) : null,
    levelStats: equationStudentStats_(className, id, answerRows),
    wrongAnswers: answerRows.filter((item) => item[8] !== "是").map((item) => ({
      timestamp:item[0] instanceof Date ? item[0].toISOString() : String(item[0] || ""),
      level:Number(item[4]) || 1, question:item[5], studentAnswer:item[6], correctAnswer:item[7],
    })),
  };
}

function equationStudentStats_(className, id, answerRows) {
  const saved = JSON.parse(PropertiesService.getScriptProperties().getProperty(`equation-stats:${className}:${Number(id)}`) || "{}");
  return equationLevelStats_(answerRows).map((stats) => {
    const baseline = saved[stats.level];
    if (baseline && Number(baseline.total) > stats.total) return { level:stats.level, total:Number(baseline.total), correct:Number(baseline.correct) || 0, streak:Number(baseline.streak) || 0, accuracy:Number(baseline.correct || 0) / Number(baseline.total) };
    return stats;
  });
}

function equationLevelStats_(answerRows) {
  const stats = [1,2,3,4,5].map((level) => ({ level, total:0, correct:0, streak:0, accuracy:0 }));
  answerRows.forEach((row) => {
    const item = stats[clamp_(Number(row[4]) || 1, 1, 5) - 1];
    item.total += 1;
    if (row[8] === "是") { item.correct += 1; item.streak += 1; }
    else item.streak = 0;
  });
  stats.forEach((item) => { item.accuracy = item.total ? item.correct / item.total : 0; });
  return stats;
}

function equationAnswerFromRow_(row) {
  return {
    timestamp:row[0] instanceof Date ? row[0].toISOString() : String(row[0] || ""),
    className:row[1], id:Number(row[2]), name:row[3], level:Number(row[4]) || 1,
    question:row[5], studentAnswer:row[6], correctAnswer:row[7], isCorrect:row[8] === "是",
  };
}

function saveEquationPlayer_(sheet, payload) {
  const rows = dataRows_(sheet, 10);
  const rowIndex = rows.findIndex((row) => row[0] === payload.className && Number(row[1]) === Number(payload.id));
  if (rowIndex >= 0 && Number(rows[rowIndex][5]) > Number(payload.total || 0)) return;
  const values = [[
    safeText_(payload.className, 12), Number(payload.id), safeText_(payload.name, 30),
    clamp_(Number(payload.level) || 1, 1, 5), clamp_(Number(payload.xp) || 0, 0, 500),
    clamp_(Number(payload.total) || 0, 0, 1000000), clamp_(Number(payload.correct) || 0, 0, 1000000),
    clamp_(Number(payload.streak) || 0, 0, 100000), clamp_(Number(payload.mistakes) || 0, 0, 1000), new Date(),
  ]];
  if (rowIndex >= 0) sheet.getRange(rowIndex + 2, 1, 1, 10).setValues(values);
  else sheet.getRange(sheet.getLastRow() + 1, 1, 1, 10).setValues(values);
}

function appendEquationAnswers_(sheet, payload) {
  const answers = Array.isArray(payload.answers) ? payload.answers.slice(0, 10) : [];
  if (!answers.length) return;
  const rows = answers.map((answer) => [
    new Date(), safeText_(payload.className, 12), Number(payload.id), safeText_(payload.name, 30),
    clamp_(Number(answer.level) || 1, 1, 5), safeText_(answer.question, 240),
    safeText_(answer.studentAnswer, 80), safeText_(answer.correctAnswer, 80), answer.isCorrect ? "是" : "否",
  ]);
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 9).setValues(rows);
}

function updateEquationBoss_(sheet, className, damage) {
  const rows = dataRows_(sheet, 4);
  const index = rows.findIndex((row) => row[0] === className);
  if (index < 0) return;
  const state = equationStateValues_(rows[index]);
  sheet.getRange(index + 2, 2, 1, 3).setValues([[Math.max(0, state.bossHp - clamp_(damage, 0, 450)), state.bossMaxHp, new Date()]]);
}

function equationStateValues_(row) {
  if (!row) return { bossHp:EQUATION_BOSS_HP, bossMaxHp:EQUATION_BOSS_HP };
  const previousMax = Math.max(1, Number(row[2]) || EQUATION_BOSS_HP);
  const previousHp = Math.max(0, Math.min(previousMax, Number.isFinite(Number(row[1])) ? Number(row[1]) : previousMax));
  return { bossHp:Math.max(0, EQUATION_BOSS_HP - (previousMax - previousHp)), bossMaxHp:EQUATION_BOSS_HP };
}

function resetEquationData_(sheets, className) {
  const properties = PropertiesService.getScriptProperties();
  Object.keys(properties.getProperties()).filter((key) => key.startsWith("equation-stats:") && (!className || key.startsWith(`equation-stats:${className}:`))).forEach((key) => properties.deleteProperty(key));
  rewriteRationalRows_(sheets.player, 10, (row) => className && row[0] !== className);
  rewriteRationalRows_(sheets.answer, 9, (row) => className && row[1] !== className);
  dataRows_(sheets.classState, 4).forEach((row, index) => {
    if (!className || row[0] === className) sheets.classState.getRange(index + 2, 2, 1, 3).setValues([[EQUATION_BOSS_HP, EQUATION_BOSS_HP, new Date()]]);
  });
  SpreadsheetApp.flush();
}

function clearEquationDashboardCache_(className) {
  const keys = [equationDashboardCacheKey_(""), equationDashboardCacheKey_(className)];
  if (!className) RATIONAL_CLASSES.forEach((item) => keys.push(equationDashboardCacheKey_(item)));
  CacheService.getScriptCache().removeAll(keys);
}

function equationDashboardCacheKey_(className) {
  return `equation-dashboard:${encodeURIComponent(className || "all")}`;
}


