const user_ids = {};
const levels = {};
const metadata = {};
let load_complete = false;
let viewing_cached_data = false;
let charts_initialized = false;

window.addEventListener("hashchange", loadHashPage);
window.onload = refreshApiData;
google.charts.load("current", {
  packages: ["corechart"]
});
google.charts.setOnLoadCallback(function() {
  charts_initialized = true;
});

// ---------------------------------------------------------
function loadHashPage() {
  if (!load_complete) return;
  let h = window.location.hash || "#overview";
  const page_path = h.replace(/^#/, "/");
  gtag("set", "page_path", page_path);
  gtag("event", "page_view", {
    "page_path": page_path
  });
  if (typeof h != "string") return showLevels();
  if (!h.startsWith("#")) return showLevels();
  h = h.substring(1);
  if (!isNaN(parseInt(h))) return showPlayer(h);
  if (h == "overview") return showLevels();
  if (h == "top_players") return showTopPlayers();
  if (h == "top_players_1k") return showTopPlayers1k();
  return showLevel(h);
}

// ---------------------------------------------------------
function levelName(level_id) {
  return metadata[level_id].name || level_id;
}

function playerName(player_id) {
  return user_ids[player_id] || player_id;
}

// ---------------------------------------------------------
function activateOverviewButton() {
  activateButton("Level Overview", "overview");
}

function activateTopPlayersButton() {
  activateButton("Top Players", "top_players");
}

function activateTopPlayers1kButton() {
  activateButton("Top Players (>1k solvers)", "top_players_1k");
}

function activateLevelButton(level_id) {
  activateButton(levelName(level_id), level_id);
}

function activatePlayerButton(player_id) {
  activateButton(playerName(player_id), player_id);
}

function activateButton(text, hash) {
  const container = document.getElementById("button-container");
  let button = null;
  for (const c in container.children) {
    const e = container.children[c];
    if (e.textContent == text) {
      button = e;
    } else if (e.id != "btn_refresh") {
      e.className = "btn btn-outline-primary";
    }
  }

  if (button == null) {
    // Create a new button
    button = createButton(text, hash);
    container.appendChild(button);
  }
  button.className = "btn btn-primary";
}

function createButton(text, hash) {
  const button = document.createElement("button");
  button.setAttribute("id", "btn_" + hash);
  button.className = "btn btn-outline-primary";
  button.setAttribute("onclick", "window.location.hash='" + hash + "'");
  const buttonText = document.createTextNode(text);
  button.appendChild(buttonText);
  return button;
}

// ---------------------------------------------------------
function readBookmarks() {
  let bookmarks = localStorage.getItem("bookmarks") || "flood_predictor;6;5729";
  bookmarks = bookmarks?.split(/;/) || [];
  return bookmarks.filter(e => e);
}

function createBookmark(bookmark) {
  const i = document.createElement("i");
  i.setAttribute("id", "bookmark_" + bookmark);
  i.setAttribute("role", "img");
  i.setAttribute("aria-label", "Bookmark");
  i.setAttribute("onclick", "toggleBookmark('" + bookmark + "');");
  const bookmarks = readBookmarks();
  if (bookmarks.includes(bookmark)) {
    i.className = "bi bi-bookmark-star";
  } else {
    i.className = "bi bi-bookmark";
  }
  return i;
}

function bookmarkSort(x, y) {
  if (!isNaN(parseInt(x))) {
    x = parseInt(x);
    if (!isNaN(parseInt(y))) {
      y = parseInt(y);
      if (x < y) return -1;
      if (x > y) return 1;
      return 0;
    }
    return -1;
  }
  if (!isNaN(parseInt(y))) {
    return 1;
  }
  if (x < y) return -1;
  if (x > y) return 1;
  return 0;
}

function toggleBookmark(bookmark) {
  const i = document.getElementById("bookmark_" + bookmark);
  let bookmarks = readBookmarks();
  if (bookmarks.includes(bookmark)) {
    bookmarks = bookmarks.filter(b => b != bookmark);
    i.className = "bi bi-bookmark";
    gtag("event", "remove_bookmark", {
      "value": bookmark
    });
  } else {
    bookmarks.push(bookmark);
    bookmarks.sort(bookmarkSort);
    i.className = "bi bi-bookmark-star";
    gtag("event", "add_bookmark", {
      "value": bookmark
    });
  }
  if (bookmarks.length == 0) {
    localStorage.removeItem("bookmarks");
  } else {
    localStorage.setItem("bookmarks", bookmarks.join(";"));
  }
}

function loadBookmarks() {
  const bookmarks = readBookmarks();
  const container = document.getElementById("button-container");
  for (b in bookmarks) {
    const bookmark = bookmarks[b];
    if (document.getElementById("btn_" + bookmark)) continue;
    if (!isNaN(parseInt(bookmark)) && Object.keys(user_ids).includes(bookmark)) {
      const player_name = playerName(bookmark);
      const button = createButton(player_name, bookmark);
      container.appendChild(button);
    } else if (Object.keys(levels).includes(bookmark)) {
      const level_name = levelName(bookmark);
      const button = createButton(level_name, bookmark);
      container.appendChild(button);
    } else {
      // console.log("Ignoring unrecognized bookmark: " + bookmark);
    }
  }
}

// ---------------------------------------------------------
function refreshApiData() {
  gtag("event", load_complete ? "refresh" : "load");
  const reload = load_complete;
  load_complete = false;
  viewing_cached_data = false;

  const refresh = document.getElementById("btn_refresh");
  refresh.className = "btn btn-outline-primary";

  const title = document.createElement("h2");
  const titleText = document.createTextNode("Downloading scores...");
  title.appendChild(titleText);
  document.getElementById("content").replaceChildren(title);

  loadApiData(reload)
    .then(([usernames, scores, level_meta]) => {
      if (!viewing_cached_data) {
        localStorage.setItem("updated", Date.now());
      }
      const updated = localStorage.getItem("updated") || 0;
      const elapsed = Date.now() - updated;
      const staleCacheMs = 1000 * 60 * 60; // 1 hour
      const delay = Math.max(0, staleCacheMs - elapsed);
      setTimeout(() => {
        // console.log("Cache data is stale");
        refresh.className = "btn btn-outline-warning";
      }, delay);
      handleUsernames(usernames);
      handleScores(scores);
      handleLevelMeta(level_meta);
      load_complete = true;
      loadBookmarks();
      loadHashPage();
    })
    .catch((error) => {
      refresh.className = "btn btn-outline-danger";
      const title = document.createElement("h2");
      const titleText = document.createTextNode("Failed to load: " + error);
      title.appendChild(titleText);
      const pre = document.createElement("pre");
      const preText = document.createTextNode(error.stack);
      pre.appendChild(preText);
      document.getElementById("content").replaceChildren(title, pre);
    });
}

// ---------------------------------------------------------
async function loadApiData(reload) {
  const fetch = reload ? fetchWithCache : cacheWithFetch;
  const [usernamesResponse, scoresResponse, metadataResponse] = await Promise.all([
    fetch("https://turingcomplete.game/api_usernames"),
    fetch("https://turingcomplete.game/api_scores"),
    fetch("https://turingcomplete.game/api_level_meta"),
  ]);
  const usernames = await usernamesResponse.text();
  const scores = await scoresResponse.text();
  const metadata = await metadataResponse.text();
  return [usernames, scores, metadata];
}

// ---------------------------------------------------------
async function fetchWithCache(url) {
  const cache = await caches.open("scores");
  const response = await fetch(url);
  if (response && response.ok) {
    cache.put(url, response);
  }
  return await cache.match(url);
}

async function cacheWithFetch(url) {
  const cache = await caches.open("scores");
  const cachedResponse = await cache.match(url);
  if (cachedResponse && cachedResponse.ok) {
    // console.log("Retrieved cached data");
    viewing_cached_data = true;
    return cachedResponse;
  }
  // console.log("Fetching fresh data");
  await cache.add(url);
  return await cache.match(url);
}

// ---------------------------------------------------------
function handleUsernames(data) {
  // Server id to username relationship
  const usernames = data.trim().split(/\n/);
  for (let i = 0; i < usernames.length; i++) {
    const x = usernames[i].split(/,/, 2);
    const id = x[0];
    const name = x[1];
    user_ids[id] = name;
  }
  console.log("Read " + usernames.length + " usernames");
}

function handleScores(data) {
  // Server scores (user_id, level_id, nand, delay, tick)
  const scores = data.trim().split(/\n/);
  for (let i = 0; i < scores.length; i++) {
    const x = scores[i].split(/,/, 5);
    const user_id = x[0];
    const user_name = playerName(user_id);
    const level_id = x[1];
    const nand = parseInt(x[2]);
    const delay = parseInt(x[3]);
    const tick = parseInt(x[4]);
    if (!(level_id in levels)) {
      levels[level_id] = {};
    }
    levels[level_id][user_id] = {
      nand: nand,
      delay: delay,
      tick: tick,
      sum: nand + delay + tick
    };
  }
  console.log("Read " + scores.length + " scores");
}

function handleLevelMeta(level_meta) {
  // Meta data for levels (enum_number, enum_id, title, is_architecture, no_score).
  // The order here is the same as on player profiles.
  const data = level_meta.trim().split(/\n/);
  for (let i = 0; i < data.length; i++) {
    const m = data[i].split(/,/);
    const level_id = m[1];
    metadata[level_id] = {
      sort_key: parseInt(i),
      name: m[2],
      arch: m[3] === "true",
      scored: m[4] === "false",
    };
  }
}

// ---------------------------------------------------------
function calculateMedian(list) {
  const sorted_list = list.sort((a, b) => a - b);
  const middle = (list.length - 1) / 2;
  return (list[Math.floor(middle)] + list[Math.ceil(middle)]) / 2
}

// ---------------------------------------------------------
function showLevels() {
  activateOverviewButton();
  const heading = "Level Overview";
  const headers = [
    "Level",
    "Solvers",
    "First",
    "Best",
    "Median",
  ];
  const rows = [];

  // Sort levels by number of solvers
  const sorted_levels = Object.keys(levels).sort(function(x, y) {
    const sx = Object.keys(levels[x]).length;
    const sy = Object.keys(levels[y]).length;
    if (sx < sy) return 1;
    if (sx > sy) return -1;
    return 0;
  });
  const bookmarks = readBookmarks();
  for (level_id in sorted_levels) {
    level_id = sorted_levels[level_id];
    const level_name = levelName(level_id);
    const solvers = Object.keys(levels[level_id]);
    const sums = solvers.map(x => levels[level_id][x]["sum"]);
    const scored = metadata[level_id]["scored"];
    const num_solvers = solvers.length;
    let min, median, first;
    if (scored) {
      min = Math.min(...sums);
      median = calculateMedian(sums);
      first = solvers.filter((s) => levels[level_id][s]["sum"] <= min);
      if (first.length == 1) {
        first = playerName(first[0]);
      } else {
        first = first.length;
      }
    } else {
      min = "-";
      median = "-";
      first = "-";
    }

    const level = {
      href: "#" + level_id,
      text: level_name,
    };
    if (bookmarks.includes(level_id)) {
      level["img"] = "bi bi-star";
    }
    rows.push([
      scored ? level : level_name,
      num_solvers,
      first,
      min,
      median,
    ]);
  }

  buildTable(heading, null, headers, rows);
}

// ---------------------------------------------------------
function showTopPlayers() {
  activateTopPlayersButton();
  const heading = "Total combined scores";

  const top_levels = Object.keys(levels)
    .filter(l => Object.keys(levels[l]).some(x => levels[l][x]["sum"] > 0)); // Scored

  showTopLevels(heading, top_levels);
}

function showTopPlayers1k() {
  activateTopPlayers1kButton();
  const heading = "Total combined scores for levels with >1000 solvers";

  const top_levels = Object.keys(levels)
    .filter(l => Object.keys(levels[l]).some(x => levels[l][x]["sum"] > 0)) // Scored
    .filter(l => Object.keys(levels[l]).length > 1000); // More than 1000 solvers

  showTopLevels(heading, top_levels);
}

function showTopLevels(heading, top_levels) {
  const headers = ["Player", "Place", "nand", "delay", "tick", "sum"];
  const rows = [];

  const top_players = Object.keys(levels[top_levels[0]])
    .filter(p => top_levels.every(l => p in levels[l]));

  const bookmarks = readBookmarks();
  const results = top_players.map(function(player_id) {
    const player = {
      href: "#" + player_id,
      text: playerName(player_id),
    };
    if (bookmarks.includes(player_id)) {
      player["img"] = "bi bi-star";
    }
    const s = top_levels.map(l => levels[l][player_id]);
    return {
      player: player,
      nand: s.map(a => a.nand).reduce((a, b) => a + b),
      delay: s.map(a => a.delay).reduce((a, b) => a + b),
      tick: s.map(a => a.tick).reduce((a, b) => a + b),
      sum: s.map(a => a.sum).reduce((a, b) => a + b),
    };
  }).sort(function(x, y) {
    const sx = x.sum;
    const sy = y.sum;
    if (sx < sy) return -1;
    if (sx > sy) return 1;
    return 0;
  });

  let num_results = 0;
  let place = 1;
  let data = [
    ["player", "sum"]
  ];
  for (const r in results) {
    if (++num_results > 100) break; // Only show 100 results

    const result = results[r];

    if (r > 0) {
      const result_above = results[r - 1];
      const sum = result["sum"];
      const sum_above = result_above["sum"];
      if (sum != sum_above) {
        place = num_results;
      }
    }

    rows.push([
      result["player"],
      place,
      result["nand"],
      result["delay"],
      result["tick"],
      result["sum"],
    ]);
  }

  if (num_results < 100) {
    // Honorable mention for players who have not completed of the levels
    let sum_above = 0;
    for (let i = 1; i < top_levels.length; i++) {
      place = num_results + 1;
      const honorable_players = Object.keys(levels.crude_awakening)
        .filter(p => top_levels.filter(l => p in levels[l]).length == (top_levels.length - i))
        .map(function(player_id) {
          const player = {
            href: "#" + player_id,
            text: playerName(player_id),
          };
          if (bookmarks.includes(player_id)) {
            player["img"] = "bi bi-star";
          }
          const s = top_levels
            .filter(l => player_id in levels[l])
            .map(l => levels[l][player_id]);
          return {
            player: player,
            nand: s.map(a => a.nand).reduce((a, b) => a + b),
            delay: s.map(a => a.delay).reduce((a, b) => a + b),
            tick: s.map(a => a.tick).reduce((a, b) => a + b),
            sum: s.map(a => a.sum).reduce((a, b) => a + b),
          };
        }).sort(function(x, y) {
          const sx = x.sum;
          const sy = y.sum;
          if (sx < sy) return -1;
          if (sx > sy) return 1;
          return 0;
        });
      for (const h in honorable_players) {
        if (++num_results > 100) break;
        const result = honorable_players[h];
        if (result.sum != sum_above) {
          place = num_results;
          sum_above = result.sum;
        }
        rows.push([
          result.player,
          place + " [" + i + "]",
          result["nand"],
          result["delay"],
          result["tick"],
          result["sum"],
        ]);
      }
      if (num_results >= 100) break;
    }
  }

  const p90 = results[Math.floor(results.length * 0.90)];
  const sum_limit = p90.sum / 0.90;
  for (const r in results) {
    const result = results[r];
    if (result.sum >= sum_limit) break;
    data.push([
      result["player"]["text"],
      result["sum"],
    ]);
  }

  const style = getComputedStyle(document.body);
  const textColor = style.getPropertyValue(darkmode.inDarkMode ? "--bs-light" : "--bs-dark");
  const bgColor = style.getPropertyValue(darkmode.inDarkMode ? "--bs-bg-color-alt" : "--bs-bg-color");
  const options = {
    width: Math.min(1050, window.innerWidth * 0.90),
    height: 500,
    chartArea: {
      left: 20,
      top: 0,
      width: "95%",
      height: "85%",
    },
    legend: {
      position: "none",
    },
    hAxis: {
      slantedText: true,
      slantedTextAngle: -60,
      textStyle: {
        color: textColor,
      },
    },
    vAxis: {
      gridlines: {
        count: 2,
      }
    },
    backgroundColor: bgColor,
    histogram: {
      bucketSize: 1,
      maxNumBuckets: Math.min(50, results.length),
    },
  };
  buildTable(heading, null, headers, rows, (plotContainer) => {
    const chart = new google.visualization.Histogram(plotContainer);
    const dataTable = google.visualization.arrayToDataTable(data);
    chart.draw(dataTable, options);
  });
}

// ---------------------------------------------------------
function showLevel(level_id) {
  activateLevelButton(level_id);
  const level_name = levelName(level_id);
  const heading = "Leaderboard for " + level_name;
  const bookmark = createBookmark(level_id);
  const headers = ["Player", "Place", "nand", "delay", "tick", "sum"];
  const rows = [];

  // Sort solvers by lowest sum
  const sorted_solvers = Object.keys(levels[level_id]).sort(function(x, y) {
    const xs = levels[level_id][x]["sum"];
    const ys = levels[level_id][y]["sum"];
    if (xs < ys) return -1;
    if (xs > ys) return 1;
    return 0;
  });

  let solves = 0;
  let place = 1;
  const bookmarks = readBookmarks();
  const data = [
    ["solver", "sum"]
  ];
  const ticksScored =
    metadata[level_id]["scored"] &&
    metadata[level_id]["arch"];
  for (const s in sorted_solvers) {
    if (++solves > 100) break; // Only show 100 results

    const solver_id = sorted_solvers[s];
    const solver_name = playerName(solver_id);
    const solver = levels[level_id][solver_id];
    const nand = solver["nand"];
    const delay = solver["delay"];
    const tick = ticksScored ? solver["tick"] : "-";
    const sum = solver["sum"];

    if (s > 0) {
      const solver_id_above = sorted_solvers[s - 1];
      const solver_above = levels[level_id][solver_id_above];
      const sum_above = solver_above["sum"];
      if (sum != sum_above) {
        place = solves;
      }
    }
    const player = {
      href: "#" + solver_id,
      text: solver_name,
    };
    if (bookmarks.includes(solver_id)) {
      player["img"] = "bi bi-star";
    }
    rows.push([
      player,
      place,
      nand,
      delay,
      tick,
      sum
    ]);
  }
  const p90 = sorted_solvers[Math.floor(sorted_solvers.length * 0.90)];
  const sum_limit = Math.min(99999, levels[level_id][p90]["sum"] / 0.90);
  for (const s in sorted_solvers) {
    const solver_id = sorted_solvers[s];
    const solver_name = playerName(solver_id);
    const solver = levels[level_id][solver_id];
    const sum = solver["sum"];
    if (sum >= sum_limit) break;
    data.push([
      solver_name,
      sum
    ]);
  }

  const style = getComputedStyle(document.body);
  const textColor = style.getPropertyValue(darkmode.inDarkMode ? "--bs-light" : "--bs-dark");
  const bgColor = style.getPropertyValue(darkmode.inDarkMode ? "--bs-bg-color-alt" : "--bs-bg-color");
  const options = {
    width: Math.min(1050, window.innerWidth * 0.90),
    height: 500,
    chartArea: {
      left: 20,
      top: 0,
      width: "95%",
      height: "85%",
    },
    legend: {
      position: "none"
    },
    hAxis: {
      slantedText: true,
      slantedTextAngle: -60,
      textStyle: {
        color: textColor,
      },
    },
    vAxis: {
      gridlines: {
        count: 2
      }
    },
    backgroundColor: bgColor,
    histogram: {
      bucketSize: 1,
      maxNumBuckets: Math.min(50, sorted_solvers.length),
    },
  };
  buildTable(heading, bookmark, headers, rows, (plotContainer) => {
    const chart = new google.visualization.Histogram(plotContainer);
    const dataTable = google.visualization.arrayToDataTable(data);
    chart.draw(dataTable, options);
  });
}

// ---------------------------------------------------------
function showPlayer(player_id) {
  activatePlayerButton(player_id);
  const player_name = playerName(player_id);
  const heading = "Stats for " + player_name;
  const bookmark = createBookmark(player_id);
  const headers = ["Level", "Place", "# tied", "nand", "delay", "tick", "sum"];
  const rows = [];

  // Sort levels by number of solvers
  const sorted_levels = Object.keys(levels).sort(function(x, y) {
    const sx = Object.keys(levels[x]).length;
    const sy = Object.keys(levels[y]).length;
    if (sx < sy) return 1;
    if (sx > sy) return -1;
    return 0;
  });
  const bookmarks = readBookmarks();
  for (const l in sorted_levels) {
    const level_id = sorted_levels[l];
    const level_name = levelName(level_id);
    let place = "-",
      ties = "-",
      nand = "-",
      delay = "-",
      tick = "-",
      sum = "-";
    const solved = (player_id in levels[level_id]);
    const solves = Object.keys(levels[level_id])
      .map(x => levels[level_id][x]);
    const ticksScored =
      metadata[level_id]["scored"] &&
      metadata[level_id]["arch"];
    const scored =
      metadata[level_id]["scored"];
    if (solved && scored) {
      const player_score = levels[level_id][player_id];
      nand = player_score["nand"];
      delay = player_score["delay"];
      if (ticksScored) {
        tick = player_score["tick"];
      }
      sum = player_score["sum"];
      ties = solves
        .filter(x => x["sum"] == sum)
        .length;
      if (ties == 1) ties = "-";
      place = solves
        .filter(x => x["sum"] < sum)
        .length + 1;
    } else if (solved) {
      place = "unscored";
    }
    const level = {
      href: "#" + level_id,
      text: level_name,
    };
    if (bookmarks.includes(level_id)) {
      level["img"] = "bi bi-star";
    }
    rows.push([
      scored ? level : level_name,
      place,
      ties,
      nand,
      delay,
      tick,
      sum
    ]);
  }

  buildTable(heading, bookmark, headers, rows, (container) => {
    const div = document.createElement("div");
    const img = document.createElement("img");
    img.src = "https://turingcomplete.game/avatars/" + player_id + ".jpg";
    div.appendChild(img);
    container.appendChild(div);

    const link = document.createElement("a");
    link.href = "https://turingcomplete.game/profile/" + player_id;
    const player_name = playerName(player_id);
    const linkText = document.createTextNode(player_name + "'s Profile [turingcomplete.game]");
    link.appendChild(linkText);
    container.appendChild(link);
  });
}

// ---------------------------------------------------------
function buildTable(heading, bookmark, headers, rows, extra) {
  const title = document.createElement("h2");
  const titleText = document.createTextNode(heading);
  title.appendChild(titleText);
  if (bookmark) title.appendChild(bookmark);

  let extraContainer = null;
  if (extra) {
    extraContainer = document.createElement("div");
    extra(extraContainer);
  }

  const tbl = document.createElement("table");
  tbl.className = "table table-striped w-auto";
  const tblBody = document.createElement("tbody");
  const tblHead = document.createElement("thead");
  tblHead.className = "sticky-top";

  const row = document.createElement("tr");

  for (const h in headers) {
    const header = document.createElement("th");
    header.appendChild(document.createTextNode(headers[h]));
    row.appendChild(header);
  }

  tblHead.appendChild(row);
  tbl.appendChild(tblHead);

  for (const r in rows) {
    const rows_r = rows[r];
    const row = document.createElement("tr");

    for (const c in rows_r) {
      const rows_rc = rows_r[c];
      const cell = document.createElement("td");
      if (["string", "number"].includes(typeof rows_rc)) {
        const cellText = document.createTextNode(rows_rc);
        cell.appendChild(cellText);
      } else {
        const cellText = document.createTextNode(rows_rc["text"]);
        if ("href" in rows_rc) {
          const a = document.createElement("a");
          a.href = rows_rc["href"];
          a.appendChild(cellText);
          cell.appendChild(a);
        } else {
          cell.appendChild(cellText);
        }
        cell.appendChild(document.createTextNode(" "));
        if ("img" in rows_rc) {
          const i = document.createElement("i");
          i.className = rows_rc["img"];
          cell.appendChild(i);
        }
      }
      row.appendChild(cell);
    }

    tblBody.appendChild(row);
  }

  tbl.appendChild(tblBody);
  if (extraContainer) {
    document.getElementById("content").replaceChildren(title, extraContainer, tbl);
  } else {
    document.getElementById("content").replaceChildren(title, tbl);
  }
  tbl.setAttribute("border", "2");
}