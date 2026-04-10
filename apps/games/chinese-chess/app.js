(function () {
  "use strict";

  var API_BASE = detectAppBasePath();
  var state = {
    token: "",
    me: null,
    room: null,
    ws: null,
    selected: null,
    legalTargets: [],
  };

  var pieceLabel = {
    general: { red: "帅", black: "将" },
    advisor: { red: "仕", black: "士" },
    elephant: { red: "相", black: "象" },
    horse: { red: "马", black: "马" },
    rook: { red: "车", black: "车" },
    cannon: { red: "炮", black: "炮" },
    pawn: { red: "兵", black: "卒" },
  };

  var els = {
    board: document.getElementById("board"),
    authTip: document.getElementById("authTip"),
    sideSelect: document.getElementById("sideSelect"),
    createRoomBtn: document.getElementById("createRoomBtn"),
    roomCodeInput: document.getElementById("roomCodeInput"),
    joinRoomBtn: document.getElementById("joinRoomBtn"),
    roomCodeValue: document.getElementById("roomCodeValue"),
    roomStatusValue: document.getElementById("roomStatusValue"),
    turnValue: document.getElementById("turnValue"),
    countdownValue: document.getElementById("countdownValue"),
    chatList: document.getElementById("chatList"),
    chatInput: document.getElementById("chatInput"),
    sendChatBtn: document.getElementById("sendChatBtn"),
    messageBox: document.getElementById("messageBox"),
  };

  function ensureLeadingSlash(pathname) {
    if (!pathname) {
      return "/";
    }
    return pathname.charAt(0) === "/" ? pathname : "/" + pathname;
  }

  function ensureTrailingSlash(pathname) {
    var normalized = ensureLeadingSlash(pathname);
    return normalized.charAt(normalized.length - 1) === "/" ? normalized : normalized + "/";
  }

  function detectAppBasePath() {
    var fromScript = "";
    var currentScript = document.currentScript;
    if (currentScript && currentScript.src) {
      try {
        var scriptUrl = new URL(currentScript.src, window.location.href);
        var scriptPath = scriptUrl.pathname || "/";
        var scriptDir = scriptPath.slice(0, scriptPath.lastIndexOf("/") + 1);
        var marker = "/apps/games/chinese-chess/";
        var markerIndex = scriptDir.lastIndexOf(marker);
        if (markerIndex >= 0) {
          fromScript = scriptDir.slice(0, markerIndex + 1);
        }
      } catch (error) {
        fromScript = "";
      }
    }
    if (fromScript) {
      return ensureTrailingSlash(fromScript);
    }

    var pathname = window.location.pathname || "/";
    var marker = "/apps/games/chinese-chess/";
    var markerIndex = pathname.lastIndexOf(marker);
    if (markerIndex >= 0) {
      return ensureTrailingSlash(pathname.slice(0, markerIndex + 1));
    }
    return "/";
  }

  function buildApiPath(path) {
    return API_BASE + String(path || "").replace(/^\/+/, "");
  }

  function setMessage(text, isSuccess) {
    els.messageBox.textContent = text || "";
    els.messageBox.className = "message" + (text ? (isSuccess ? " success" : " error") : "");
  }

  function getCookie(name) {
    var cookie = document.cookie || "";
    var pairs = cookie.split(";");
    for (var i = 0; i < pairs.length; i += 1) {
      var part = pairs[i].trim();
      if (part.indexOf(name + "=") === 0) {
        return decodeURIComponent(part.slice(name.length + 1));
      }
    }
    return "";
  }

  function getStoredToken() {
    var localToken = localStorage.getItem("easyplay_token");
    if (localToken) {
      return localToken;
    }
    return getCookie("token");
  }

  function api(path, method, body) {
    return fetch(buildApiPath(path), {
      method: method || "GET",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: state.token ? "Bearer " + state.token : "",
      },
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().then(function (data) {
        if (!res.ok) {
          throw new Error((data && data.error) || "请求失败");
        }
        return data;
      });
    });
  }

  function statusText(status) {
    if (status === "waiting") {
      return "等待中";
    }
    if (status === "playing") {
      return "游戏中";
    }
    if (status === "finished") {
      return "已结束";
    }
    return status || "-";
  }

  function sideText(side) {
    return side === "red" ? "红方" : side === "black" ? "黑方" : "-";
  }

  function connectSocket() {
    if (!state.token) {
      return;
    }
    if (state.ws && (state.ws.readyState === WebSocket.OPEN || state.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    var protocol = location.protocol === "https:" ? "wss:" : "ws:";
    state.ws = new WebSocket(
      protocol + "//" + location.host + buildApiPath("ws/game?token=" + encodeURIComponent(state.token))
    );

    state.ws.onopen = function () {
      setMessage("实时连接已建立", true);
      if (state.room) {
        state.ws.send(
          JSON.stringify({
            type: "sync_state",
            payload: { roomCode: state.room.roomCode },
          })
        );
      }
    };

    state.ws.onmessage = function (event) {
      var data = {};
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        return;
      }
      if (data.type === "room_sync") {
        state.room = data.payload;
        renderRoom();
      } else if (data.type === "move_applied") {
        state.room = data.payload.room;
        state.selected = null;
        state.legalTargets = [];
        renderRoom();
      } else if (data.type === "chat") {
        if (!state.room) {
          return;
        }
        state.room.chat = state.room.chat || [];
        state.room.chat.push(data.payload);
        renderChat();
      } else if (data.type === "game_over") {
        state.room = data.payload.room;
        renderRoom();
        setMessage("对局结束，胜方：" + sideText(data.payload.winnerSide), true);
      } else if (data.type === "error") {
        setMessage(data.payload && data.payload.message ? data.payload.message : "消息错误", false);
      }
    };

    state.ws.onclose = function () {
      setTimeout(connectSocket, 1500);
    };
  }

  function renderChat() {
    var chats = (state.room && state.room.chat) || [];
    els.chatList.innerHTML = chats
      .slice(-50)
      .map(function (item) {
        return (
          '<div class="chat-item"><strong>' +
          item.username +
          "</strong>：" +
          item.text +
          "</div>"
        );
      })
      .join("");
    els.chatList.scrollTop = els.chatList.scrollHeight;
  }

  function renderRoomMeta() {
    if (!state.room) {
      els.roomCodeValue.textContent = "-";
      els.roomStatusValue.textContent = "-";
      els.turnValue.textContent = "-";
      els.countdownValue.textContent = "-";
      return;
    }
    els.roomCodeValue.textContent = state.room.roomCode;
    els.roomStatusValue.textContent = statusText(state.room.status);
    els.turnValue.textContent = sideText(state.room.gameState.turn);
  }

  function renderBoard() {
    if (!state.room || !state.room.gameState || !state.room.gameState.board) {
      els.board.innerHTML = "";
      return;
    }
    var board = state.room.gameState.board;
    var html = "";
    for (var y = 0; y < 10; y += 1) {
      for (var x = 0; x < 9; x += 1) {
        var piece = board[y][x];
        var isSelected = state.selected && state.selected.x === x && state.selected.y === y;
        var isTarget = state.legalTargets.some(function (t) {
          return t.x === x && t.y === y;
        });
        html +=
          '<div class="cell' +
          (isSelected ? " selected" : "") +
          (isTarget ? " target" : "") +
          '" data-x="' +
          x +
          '" data-y="' +
          y +
          '">';
        if (piece) {
          html +=
            '<div class="piece ' +
            piece.side +
            '" data-piece="1">' +
            pieceLabel[piece.type][piece.side] +
            "</div>";
        }
        html += "</div>";
      }
    }
    els.board.innerHTML = html;
  }

  function renderRoom() {
    renderRoomMeta();
    renderBoard();
    renderChat();
  }

  function canOperatePiece(piece) {
    if (!state.room || !state.me) {
      return false;
    }
    var mySide = null;
    if (state.room.redUserId === state.me.id) {
      mySide = "red";
    }
    if (state.room.blackUserId === state.me.id) {
      mySide = "black";
    }
    return mySide && piece.side === mySide && state.room.gameState.turn === mySide;
  }

  function calcPseudoTargets(board, x, y) {
    var piece = board[y][x];
    if (!piece) {
      return [];
    }
    var targets = [];
    var dirs = [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [-1, 2],
      [1, -2],
      [-1, -2],
    ];
    dirs.forEach(function (d) {
      var nx = x + d[0];
      var ny = y + d[1];
      if (nx >= 0 && nx < 9 && ny >= 0 && ny < 10) {
        targets.push({ x: nx, y: ny });
      }
    });
    return targets;
  }

  function sendMove(fromX, fromY, toX, toY) {
    if (!state.room || !state.ws || state.ws.readyState !== WebSocket.OPEN) {
      setMessage("连接未建立，无法走子", false);
      return;
    }
    state.ws.send(
      JSON.stringify({
        type: "move",
        payload: {
          roomCode: state.room.roomCode,
          timestamp: new Date().toISOString(),
          move: { fromX: fromX, fromY: fromY, toX: toX, toY: toY },
        },
      })
    );
  }

  function bindBoardEvents() {
    els.board.addEventListener("click", function (event) {
      var cell = event.target.closest(".cell");
      if (!cell || !state.room) {
        return;
      }
      var x = Number(cell.getAttribute("data-x"));
      var y = Number(cell.getAttribute("data-y"));
      var board = state.room.gameState.board;
      var piece = board[y][x];

      if (state.selected) {
        var canGo = state.legalTargets.some(function (t) {
          return t.x === x && t.y === y;
        });
        if (canGo) {
          sendMove(state.selected.x, state.selected.y, x, y);
          return;
        }
      }

      if (piece && canOperatePiece(piece)) {
        state.selected = { x: x, y: y };
        state.legalTargets = calcPseudoTargets(board, x, y);
      } else {
        state.selected = null;
        state.legalTargets = [];
      }
      renderBoard();
    });
  }

  function tickCountdown() {
    if (!state.room || !state.room.gameState || !state.room.gameState.turnEndsAt) {
      els.countdownValue.textContent = "-";
      return;
    }
    var remain = Math.max(0, Math.floor((new Date(state.room.gameState.turnEndsAt).getTime() - Date.now()) / 1000));
    els.countdownValue.textContent = remain + "s";
  }

  function createRoom() {
    api("api/game/rooms", "POST", { side: els.sideSelect.value })
      .then(function (data) {
        state.room = data.room;
        renderRoom();
        connectSocket();
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({ type: "join_room", payload: { roomCode: state.room.roomCode } }));
        }
        setMessage("房间创建成功：" + state.room.roomCode, true);
      })
      .catch(function (error) {
        setMessage(error.message, false);
      });
  }

  function joinRoom() {
    var code = (els.roomCodeInput.value || "").trim().toUpperCase();
    if (!code) {
      setMessage("请输入房间号", false);
      return;
    }
    api("api/game/rooms/" + code + "/join", "POST", {})
      .then(function (data) {
        state.room = data.room;
        renderRoom();
        connectSocket();
        if (state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(JSON.stringify({ type: "join_room", payload: { roomCode: code } }));
        }
        setMessage("加入房间成功", true);
      })
      .catch(function (error) {
        setMessage(error.message, false);
      });
  }

  function sendChat() {
    if (!state.room || !state.ws || state.ws.readyState !== WebSocket.OPEN) {
      setMessage("尚未连接房间", false);
      return;
    }
    var text = (els.chatInput.value || "").trim();
    if (!text) {
      return;
    }
    state.ws.send(
      JSON.stringify({
        type: "chat",
        payload: {
          roomCode: state.room.roomCode,
          message: text,
        },
      })
    );
    els.chatInput.value = "";
  }

  function initAuth() {
    state.token = getStoredToken();
    if (!state.token) {
      els.authTip.textContent = "未检测到登录态，请先返回首页登录。";
      return Promise.reject(new Error("未登录"));
    }
    return api("api/me", "GET")
      .then(function (data) {
        state.me = data.user;
        els.authTip.textContent = "当前用户：" + state.me.username;
      })
      .catch(function () {
        els.authTip.textContent = "登录态失效，请返回首页重新登录。";
        throw new Error("登录态失效");
      });
  }

  function initEvents() {
    els.createRoomBtn.addEventListener("click", createRoom);
    els.joinRoomBtn.addEventListener("click", joinRoom);
    els.sendChatBtn.addEventListener("click", sendChat);
    els.chatInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        sendChat();
      }
    });
    bindBoardEvents();
    setInterval(tickCountdown, 250);
  }

  function bootstrap() {
    renderRoom();
    initEvents();
    initAuth()
      .then(connectSocket)
      .catch(function () {
        setMessage("请先登录后使用在线象棋。", false);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
