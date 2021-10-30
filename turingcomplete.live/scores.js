var user_ids = {};
var levels = {};
var load_complete = false;
var level_names = {
  ai_showdown: "AI Showdown",
  capitalize: "Planet Names",
  flood_predictor: "Water World"
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
  var level_name = level_id;
  if (level_id in level_names) level_name = level_names[level_id];
  activateButton(level_name, level_id);
}
function activatePlayerButton(player_id) {
  var player_name = player_id;
  if (player_id in user_ids) player_name = user_ids[player_id];
  activateButton(player_name, player_id);
}
function activateButton(text, hash) {
  var container = document.getElementById("button-container");
  var button = null;
  for (var c in container.children) {
    var e = container.children[c];
    if (e.textContent == text) {
      // console.log("Found button for " + hash);
      button = e;
      break;
    }
  }

  if (button == null) {
    // Create a new button
    var button = document.createElement("button");
    button.className = "btn btn-success mr-1";
    button.setAttribute("onclick", "window.location.hash='" + hash + "'");
    var buttonText = document.createTextNode(text);
    button.appendChild(buttonText);
    container.appendChild(button);
    container.appendChild(document.createTextNode(" "));
  }

  // Move it to the front
  container.insertBefore(button, container.childNodes[5]);
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
  var usernames = data.split(/\n/);
  for (var i = 0; i < usernames.length; i++) {
    var x = usernames[i].split(/,/, 2);
    var id = x[0];
    var name = x[1];
    user_ids[id] = name;
  }
  console.log("Read " + usernames.length + " usernames");
}

function handleScores(data) {
  var scores = data.split(/\n/);
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
    "Level ID",
    "Level Name",
    "Solvers",
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
    var level_name = "";
    if (level_id in level_names) level_name = level_names[level_id];
    var solvers = Object.keys(levels[level_id]);
    var num_solvers = solvers.length;

    var sums = solvers.map((s) => levels[level_id][s]["sum"]);
    sums = sums.filter((s) => parseInt(s) < 99999);
    var max, min, average;
    if (sums.length > 0) {
      max = Math.max(...sums);
      min = Math.min(...sums);
      average = Math.floor(sums.reduce((a, b) => a + b) / sums.length);
    }

    rows.push([
      {
        // href: 'javascript:showLevel("' + level_id + '")',
        href: "#" + level_id,
        text: level_id
      },
      level_name,
      num_solvers,
      min,
      average,
      max
    ]);
  }

  buildTable(heading, headers, rows);
}

// ---------------------------------------------------------
function showLevel(level_id) {
  activateLevelButton(level_id);
  var heading = "Stats for " + level_id;
  var headers = ["Place", "Player", "nand", "delay", "tick", "sum"];
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
      place,
      {
        // href: "javascript:showPlayer(" + solver_id + ")",
        href: "#" + solver_id,
        text: solver_name
      },
      nand,
      tick,
      delay,
      sum
    ]);
  }

  buildTable(heading, headers, rows);
}

// ---------------------------------------------------------
function showPlayer(player_id) {
  activatePlayerButton(player_id);
  var player_name = user_ids[player_id];
  var heading = "Stats for " + player_name;
  var headers = ["Level ID", "nand", "tick", "delay", "sum"];
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
    var nand = "-",
      delay = "-",
      tick = "-",
      sum = "-";
    if (player_id in levels[level_id]) {
      var player_score = levels[level_id][player_id];
      nand = player_score["nand"];
      delay = player_score["delay"];
      tick = player_score["tick"];
      sum = player_score["sum"];
    }

    rows.push([
      {
        // href: 'javascript:showLevel("' + level_id + '")',
        href: "#" + level_id,
        text: level_id
      },
      nand,
      delay,
      tick,
      sum
    ]);
  }

  buildTable(heading, headers, rows);
}

// ---------------------------------------------------------
function buildTable(heading, headers, rows) {
  var title = document.createElement("h2");
  var titleText = document.createTextNode(heading);
  title.appendChild(titleText);

  var tbl = document.createElement("table");
  tbl.className = "table table-striped";
  var tblBody = document.createElement("tbody");
  var tblHead = document.createElement("thead");

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
        // console.log(typeof rows_rc + ": " + rows_rc);
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
