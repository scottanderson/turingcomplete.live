const user_ids = {};
const levels = {};
const level_names = {
  ai_showdown: "AI Showdown",
  alu_1: "Logic Engine",
  alu_2: "Arithmetic Engine",
  always_on: "Always On",
  and_gate: "AND Gate",
  and_gate_3: "Bigger AND Gate",
  any_doubles: "Double Trouble",
  binary_programming: "Add 5",
  binary_racer: "Binary Racer",
  binary_search: "Storage Cracker",
  bit_adder: "Half Adder",
  bit_inverter: "Bit Inverter",
  buffer: "One Way",
  byte_adder: "Adding Bytes",
  byte_and: "Byte AND",
  byte_constant: "Byte Constant",
  byte_equal: "Equality",
  byte_less: "Unsigned Less",
  byte_less_i: "Signed Less",
  byte_mux: "Input Selector",
  byte_not: "Byte NOT",
  byte_or: "Byte OR",
  byte_switch: "Switch",
  byte_xor: "Byte XOR",
  call_ret: "Functions",
  capitalize: "Planet Names",
  circumference: "Calibrating Laser Cannons",
  component_factory: "Component Factory",
  compute_xor: "XOR",
  computing_codes: "Calculations",
  conditions: "Conditions",
  constants: "Immediate Values",
  counting_signals: "Counting Signals",
  crude_awakening: "Crude Awakening",
  dance: "Dancing Machine",
  decoder: "Instruction Decoder",
  delay_level: "Delay",
  demux: "1 bit decoder",
  demux_3: "3 bit decoder",
  dependency: "Circular Dependency",
  divide: "Divide",
  double_number: "Double the Number",
  flood_predictor: "Water World",
  full_adder: "Full Adder",
  leg_1: "Wire Spaghetti",
  leg_2: "Opcodes",
  leg_3: "Immediate Values",
  leg_4: "Conditionals",
  maze: "The Maze",
  mod_4: "Masking Time",
  multiply: "The Product of Nibbles",
  nand_gate: "NAND Gate",
  negative_numbers: "Negative Numbers",
  nor_gate: "NOR Gate",
  not_gate: "NOT Gate",
  odd_number_of_signals: "ODD Number of Signals",
  or_gate: "OR Gate",
  or_gate_3: "Bigger OR Gate",
  program: "Program",
  push_pop: "PUSH and POP",
  ram: "RAM",
  ram_component: "Little Box",
  registers: "Registers",
  robot_racing: "Robot Racing",
  saving_bytes: "Saving Bytes",
  saving_gracefully: "Saving Gracefully",
  second_tick: "Second Tick",
  shift: "Shift",
  signed_negator: "Signed negator",
  sorter: "Delicious Order",
  spacial_invasion: "Spacial Invasion",
  sr_latch: "Tangled Gates",
  stack: "Stack",
  test_lab: "The Lab",
  tick_tock: "Counter",
  tower: "Tower of Radioactive Alloy",
  turing_complete: "Turing Complete",
  unseen_fruit: "Unseen Fruit",
  wide_instructions: "Wide Instructions",
  xnor: "XNOR Gate",
  xor_gate: "XOR Gate",
};
let load_complete = false;

window.addEventListener("hashchange", loadHashPage);
window.onload = refreshApiData;

// ---------------------------------------------------------
function loadHashPage() {
  if (!load_complete) return;
  var h = window.location.hash || "#overview";
  var page_path = h.replace(/^#/, "/");
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
  return showLevel(h);
}

// ---------------------------------------------------------
function activateOverviewButton() {
  activateButton("Level Overview", "overview");
}

function activateTopPlayersButton() {
  activateButton("Top Players", "top_players");
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
    gtag("event", "remove_bookmark", {
      "value": bookmark
    });
  } else {
    bookmarks.push(bookmark);
    bookmarks.sort();
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
  var bookmarks = readBookmarks();
  var container = document.getElementById("button-container");
  for (b in bookmarks) {
    var bookmark = bookmarks[b];
    if (document.getElementById("btn_" + bookmark)) continue;
    if (!isNaN(parseInt(bookmark)) && Object.keys(user_ids).includes(bookmark)) {
      var player_name = user_ids[bookmark] || bookmark;
      var button = createButton(player_name, bookmark);
      container.appendChild(button);
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
  gtag("event", load_complete ? "refresh" : "load");
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
  var sorted_levels = Object.keys(levels).sort(function(x, y) {
    var sx = Object.keys(levels[x]).length;
    var sy = Object.keys(levels[y]).length;
    if (sx < sy) return 1;
    if (sx > sy) return -1;
    return 0;
  });
  var bookmarks = readBookmarks();
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

    var level = {
      href: "#" + level_id,
      text: level_name,
    };
    if (bookmarks.includes(level_id)) {
      level["img"] = "bi bi-star";
    }
    rows.push([
      level,
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
function showTopPlayers() {
  activateTopPlayersButton();
  var heading = "Total combined scores for levels with >1000 solvers";
  var headers = ["Player", "Place", "nand", "delay", "tick", "sum"];
  var rows = [];

  var top_levels = Object.keys(levels)
    .filter(l => Object.keys(levels[l]).some(x => levels[l][x]["sum"] > 0)) // Scored
    .filter(l => Object.keys(levels[l]).length > 1000); // More than 1000 solvers

  var top_players = Object.keys(levels[top_levels[0]])
    .filter(p => top_levels.every(l => p in levels[l]));

  var bookmarks = readBookmarks();
  var results = top_players.map(function(player_id) {
    var player = {
      href: "#" + player_id,
      text: user_ids[player_id],
    };
    if (bookmarks.includes(player_id)) {
      player["img"] = "bi bi-star";
    }
    var s = top_levels.map(l => levels[l][player_id]);
    return {
      player: player,
      nand: s.map(a => a.nand).reduce((a, b) => a + b),
      delay: s.map(a => a.delay).reduce((a, b) => a + b),
      tick: s.map(a => a.tick).reduce((a, b) => a + b),
      sum: s.map(a => a.sum).reduce((a, b) => a + b),
    };
  }).sort(function(x, y) {
    var sx = x.sum;
    var sy = y.sum;
    if (sx < sy) return -1;
    if (sx > sy) return 1;
    return 0;
  });

  var num_results = 0;
  var place = 1;
  for (var r in results) {
    if (++num_results > 100) break; // Only show 100 results

    var result = results[r];

    if (r > 0) {
      var result_above = results[r - 1];
      var sum = result["sum"];
      var sum_above = result_above["sum"];
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
  var sorted_solvers = Object.keys(levels[level_id]).sort(function(x, y) {
    var xs = levels[level_id][x]["sum"];
    var ys = levels[level_id][y]["sum"];
    if (xs < ys) return -1;
    if (xs > ys) return 1;
    return 0;
  });

  var solves = 0;
  var place = 1;
  var bookmarks = readBookmarks();
  for (var s in sorted_solvers) {
    if (++solves > 100) break; // Only show 100 results

    var solver_id = sorted_solvers[s];
    var solver_name = user_ids[solver_id];
    var solver = levels[level_id][solver_id];
    var nand = solver["nand"];
    var delay = solver["delay"];
    var tick = solver["tick"];
    var sum = solver["sum"];

    if (s > 0) {
      var solver_id_above = sorted_solvers[s - 1];
      var solver_above = levels[level_id][solver_id_above];
      var sum_above = solver_above["sum"];
      if (sum != sum_above) {
        place = solves;
      }
    }
    var player = {
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

  buildTable(heading, bookmark, headers, rows);
}

// ---------------------------------------------------------
function showPlayer(player_id) {
  activatePlayerButton(player_id);
  var player_name = user_ids[player_id] || player_id;
  var heading = "Stats for " + player_name;
  var bookmark = createBookmark(player_id);
  var headers = ["Level", "Place", "# tied", "nand", "delay", "tick", "sum"];
  var rows = [];

  // Sort levels by number of solvers
  var sorted_levels = Object.keys(levels).sort(function(x, y) {
    var sx = Object.keys(levels[x]).length;
    var sy = Object.keys(levels[y]).length;
    if (sx < sy) return 1;
    if (sx > sy) return -1;
    return 0;
  });
  var bookmarks = readBookmarks();
  for (var l in sorted_levels) {
    var level_id = sorted_levels[l];
    var level_name = level_names[level_id] || level_id;
    var place = "-",
      ties = "-";
    var nand = "-",
      delay = "-",
      tick = "-",
      sum = "-";
    var solvers = Object.keys(levels[level_id]);
    var scored = solvers
      .map(x => levels[level_id][x]["sum"])
      .some(s => s > 0);
    if (!scored) {
      place = "unscored";
    } else if (player_id in levels[level_id]) {
      var player_score = levels[level_id][player_id];
      nand = player_score["nand"];
      delay = player_score["delay"];
      tick = player_score["tick"];
      sum = player_score["sum"];
      var solves = solvers
        .map(x => levels[level_id][x]);
      var otherTickScores = solves
        .filter(x => x["tick"] != tick)
        .length
      if (tick == 0 && otherTickScores == 0) {
        tick = "-";
      }
      ties = solves
        .filter(x => x["sum"] == sum)
        .length;
      if (ties == 1) ties = "-";
      place = solves
        .filter(x => x["sum"] < sum)
        .length + 1;
    }
    var level = {
      href: "#" + level_id,
      text: level_name,
    };
    if (bookmarks.includes(level_id)) {
      level["img"] = "bi bi-star";
    }
    rows.push([
      level,
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
        var cellText = document.createTextNode(rows_rc["text"]);
        if ("href" in rows_rc) {
          var a = document.createElement("a");
          a.href = rows_rc["href"];
          a.appendChild(cellText);
          cell.appendChild(a);
        } else {
          cell.appendChild(cellText);
        }
        cell.appendChild(document.createTextNode(" "));
        if ("img" in rows_rc) {
          var i = document.createElement("i");
          i.className = rows_rc["img"];
          cell.appendChild(i);
        }
      }
      row.appendChild(cell);
    }

    tblBody.appendChild(row);
  }

  tbl.appendChild(tblBody);
  document.getElementById("content").replaceChildren(title, tbl);
  tbl.setAttribute("border", "2");
}
