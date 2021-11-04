var user_ids = {};
var levels = {};
var load_complete = false;
var level_names = {
  ai_showdown: "AI Showdown",
  any_doubles: "Double Trouble",
  capitalize: "Planet Names",
  circumference: "Calibrating Laser Cannons",
  flood_predictor: "Water World",
  ram_component: "Little Box",
  tick_tock: "Counter",
};

window.addEventListener("hashchange", loadHashPage);
window.onload = refreshApiData;

// ---------------------------------------------------------
function loadHashPage() {
  if (!load_complete) return;
  var h = window.location.hash;
  if (typeof h != "string") return showLevels();
  if (!h.startsWith("#")) return showLevels();
  h = h.substring(1);
  if (!isNaN(parseInt(h))) return showPlayer(h);
  if (h == "overview") return showLevels();
  return showLevel(h);
}

// ---------------------------------------------------------
function activateOverviewButton() {
  activateButton("Level Overview", "overview");
}

function activateLevelButton(level_id) {
  var level_name = level_names[level_id] || level_id;
  activateButton(level_name, level_id);
}

function activatePlayerButton(player_id) {
  var player_name = user_ids[player_id] || player_id;
  activateButton(player_name, player_id);
}

function activateButton(text, hash) {
  var container = document.getElementById("button-container");
  var button = null;
  for (var c in container.children) {
    var e = container.children[c];
    if (e.textContent == text) {
      button = e;
    } else {
      e.className = "btn btn-outline-primary";
    }
  }

  if (button == null) {
    // Create a new button
    var button = createButton(text, hash);
    container.appendChild(button);
  }
  button.className = "btn btn-primary";
}

function createButton(text, hash) {
  var button = document.createElement("button");
  button.setAttribute("id", "btn_" + hash);
  button.className = "btn btn-outline-primary";
  button.setAttribute("onclick", "window.location.hash='" + hash + "'");
  var buttonText = document.createTextNode(text);
  button.appendChild(buttonText);
  return button;
}

// ---------------------------------------------------------
function readBookmarks() {
  var bookmarks = localStorage.getItem("bookmarks") || "flood_predictor;6;5729";
  bookmarks = bookmarks?.split(/;/) || [];
  return bookmarks.filter(e => e);
}

function createBookmark(bookmark) {
  var i = document.createElement("i");
  i.setAttribute("id", "bookmark_" + bookmark);
  i.setAttribute("role", "img");
  i.setAttribute("aria-label", "Bookmark");
  i.setAttribute("onclick", "toggleBookmark('" + bookmark + "');");
  var bookmarks = readBookmarks();
  if (bookmarks.includes(bookmark)) {
    i.className = "bi bi-bookmark-star";
  } else {
    i.className = "bi bi-bookmark";
  }
  return i;
}

function toggleBookmark(bookmark) {
  var i = document.getElementById("bookmark_" + bookmark);
  var bookmarks = readBookmarks();
  if (bookmarks.includes(bookmark)) {
    bookmarks = bookmarks.filter(b => b != bookmark);
    i.className = "bi bi-bookmark";
  } else {
    bookmarks.push(bookmark);
    bookmarks.sort();
    i.className = "bi bi-bookmark-star";
  }
  if (bookmarks.length == 0) {
    localStorage.removeItem("bookmarks");
  } else {
    localStorage.setItem("bookmarks", bookmarks.join(";"));
  }
}

function loadBookmarks() {
  var bookmarks = readBookmarks();
  var container = document.getElementById("button-container");
  for (b in bookmarks) {
    var bookmark = bookmarks[b];
    if (document.getElementById("btn_" + bookmark)) continue;
    if (!isNaN(parseInt(bookmark)) && Object.keys(user_ids).includes(bookmark)) {
      var player_name = user_ids[bookmark] || bookmark;
      var button = createButton(player_name, bookmark);
      container.appendChild(button);
    } else if (bookmark == "overview") {
    } else if (Object.keys(levels).includes(bookmark)) {
      var level_name = level_names[bookmark] || bookmark;
      var button = createButton(level_name, bookmark);
      container.appendChild(button);
    } else {
      // console.log("Ignoring unrecognized bookmark: " + bookmark);
    }
  }
}

// ---------------------------------------------------------
function refreshApiData() {
  load_complete = false;
  var title = document.createElement("h2");
  var titleText = document.createTextNode("Downloading stats...");
  title.appendChild(titleText);
  document.getElementById("content").replaceChildren(title);

  loadApiData()
    .then(([usernames, scores]) => {
      handleUsernames(usernames);
      handleScores(scores);
      load_complete = true;
      loadBookmarks();
      loadHashPage();
    })
    .catch((error) => {
      var title = document.createElement("h2");
      var titleText = document.createTextNode("Failed to load: " + error);
      title.appendChild(titleText);
      document.getElementById("content").replaceChildren(title);
    });
}

async function loadApiData() {
  const [usernamesResponse, scoresResponse] = await Promise.all([
    fetch("https://turingcomplete.game/api_usernames"),
    fetch("https://turingcomplete.game/api_scores")
  ]);
  const usernames = await usernamesResponse.text();
  const scores = await scoresResponse.text();
  return [usernames, scores];
}

function handleUsernames(data) {
  var usernames = data.trim().split(/\n/);
  for (var i = 0; i < usernames.length; i++) {
    var x = usernames[i].split(/,/, 2);
    var id = x[0];
    var name = x[1];
    user_ids[id] = name;
  }
  console.log("Read " + usernames.length + " usernames");
}

function handleScores(data) {
  var scores = data.trim().split(/\n/);
  for (var i = 0; i < scores.length; i++) {
    var x = scores[i].split(/,/, 5);
    var user_id = x[0];
    var user_name = user_ids[user_id];
    var level_id = x[1];
    var nand = parseInt(x[2]);
    var delay = parseInt(x[3]);
    var tick = parseInt(x[4]);
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

// ---------------------------------------------------------
function showLevels() {
  activateOverviewButton();
  var heading = "Level Overview";
  var headers = [
    "Level",
    "Solvers",
    "First",
    "Best",
    "Average",
    "Worst"
  ];
  var rows = [];

  // Sort levels by number of solvers
  var sorted_levels = Object.keys(levels).sort(function (x, y) {
    var sx = Object.keys(levels[x]).length;
    var sy = Object.keys(levels[y]).length;
    if (sx < sy) return 1;
    if (sx > sy) return -1;
    return 0;
  });
  for (level_id in sorted_levels) {
    level_id = sorted_levels[level_id];
    var level_name = level_names[level_id] || level_id;
    var solvers = Object.keys(levels[level_id]);
    var num_solvers = solvers.length;

    var sums = solvers.map((s) => levels[level_id][s]["sum"]);
    sums = sums.filter((s) => parseInt(s) < 99999);
    var max, min, average, first;
    if (sums.length > 0) {
      max = Math.max(...sums);
      min = Math.min(...sums);
      if (min == 0 && max == 0) {
        min = "-";
        max = "-";
        average = "-";
        first = "-";
      } else {
        average = Math.floor(sums.reduce((a, b) => a + b) / sums.length);
        first = solvers.filter((s) => levels[level_id][s]["sum"] <= min);
        if (first.length == 1) {
          first = user_ids[first[0]];
        } else {
          first = first.length;
        }
      }
    }

    rows.push([
      {
        href: "#" + level_id,
        text: level_name
      },
      num_solvers,
      first,
      min,
      average,
      max
    ]);
  }

  buildTable(heading, null, headers, rows);
}

// ---------------------------------------------------------
function showLevel(level_id) {
  activateLevelButton(level_id);
  var level_name = level_names[level_id] || level_id;
  var heading = "Leaderboard for " + level_name;
  var bookmark = createBookmark(level_id);
  var headers = ["Player", "Place", "nand", "delay", "tick", "sum"];
  var rows = [];

  // Sort solvers by lowest sum
  var sorted_solvers = Object.keys(levels[level_id]).sort(function (x, y) {
    var xs = levels[level_id][x]["sum"];
    var ys = levels[level_id][y]["sum"];
    if (xs < ys) return -1;
    if (xs > ys) return 1;
    return 0;
  });

  var solves = 0;
  var place = 1;
  for (var s in sorted_solvers) {
    if (solves++ > 100) break; // Only show 100 results

    var solver_id = sorted_solvers[s];
    var solver_name = user_ids[solver_id];
    var solver = levels[level_id][solver_id];
    var nand = solver["nand"];
    var tick = solver["tick"];
    var delay = solver["delay"];
    var sum = solver["sum"];

    if (s > 0) {
      var solver_id_above = sorted_solvers[s - 1];
      var solver_above = levels[level_id][solver_id_above];
      var sum_above = solver_above["sum"];
      if (sum != sum_above) {
        place = solves;
      }
    }

    rows.push([
      {
        href: "#" + solver_id,
        text: solver_name
      },
      place,
      nand,
      delay,
      tick,
      sum
    ]);
  }

  buildTable(heading, bookmark, headers, rows);
}

// ---------------------------------------------------------
function showPlayer(player_id) {
  activatePlayerButton(player_id);
  var player_name = user_ids[player_id] || player_id;
  var heading = "Stats for " + player_name;
  var bookmark = createBookmark(player_id);
  var headers = ["Level", "Place", "# tied", "nand", "tick", "delay", "sum"];
  var rows = [];

  // Sort levels by number of solvers
  var sorted_levels = Object.keys(levels).sort(function (x, y) {
    var sx = Object.keys(levels[x]).length;
    var sy = Object.keys(levels[y]).length;
    if (sx < sy) return 1;
    if (sx > sy) return -1;
    return 0;
  });
  for (var l in sorted_levels) {
    var level_id = sorted_levels[l];
    var level_name = level_names[level_id] || level_id;
    var place = "-",
      ties = "-";
    var nand = "-",
      delay = "-",
      tick = "-",
      sum = "-";
    var scored = Object.keys(levels[level_id])
      .map(x => levels[level_id][x]["sum"])
      .filter(s => s > 0)
      .length > 0;
    if (!scored) {
      place = "unscored";
    } else if (player_id in levels[level_id]) {
      var player_score = levels[level_id][player_id];
      nand = player_score["nand"];
      delay = player_score["delay"];
      tick = player_score["tick"];
      sum = player_score["sum"];

      ties = Object.keys(levels[level_id])
        .filter(x => levels[level_id][x]["sum"] == sum)
        .length;
      if (ties == 1) ties = "-";
      place = Object.keys(levels[level_id])
        .filter(x => levels[level_id][x]["sum"] < sum)
        .length + 1;
    }

    rows.push([
      {
        href: "#" + level_id,
        text: level_name
      },
      place,
      ties,
      nand,
      delay,
      tick,
      sum
    ]);
  }

  buildTable(heading, bookmark, headers, rows);
}

// ---------------------------------------------------------
function buildTable(heading, bookmark, headers, rows) {
  var title = document.createElement("h2");
  var titleText = document.createTextNode(heading);
  title.appendChild(titleText);
  if (bookmark) title.appendChild(bookmark);

  var tbl = document.createElement("table");
  tbl.className = "table table-striped w-auto";
  var tblBody = document.createElement("tbody");
  var tblHead = document.createElement("thead");
  tblHead.className = "sticky-top";

  var row = document.createElement("tr");

  for (var h in headers) {
    var header = document.createElement("th");
    header.appendChild(document.createTextNode(headers[h]));
    row.appendChild(header);
  }

  tblHead.appendChild(row);
  tbl.appendChild(tblHead);

  for (var r in rows) {
    var rows_r = rows[r];
    var row = document.createElement("tr");

    for (var c in rows_r) {
      var rows_rc = rows_r[c];
      var cell = document.createElement("td");
      if (["string", "number"].includes(typeof rows_rc)) {
        var cellText = document.createTextNode(rows_rc);
        cell.appendChild(cellText);
      } else {
        var a = document.createElement("a");
        a.href = rows_rc["href"];
        var cellText = document.createTextNode(rows_rc["text"]);
        a.appendChild(cellText);
        cell.appendChild(a);
      }
      row.appendChild(cell);
    }

    tblBody.appendChild(row);
  }

  tbl.appendChild(tblBody);
  document.getElementById("content").replaceChildren(title, tbl);
  tbl.setAttribute("border", "2");
}
