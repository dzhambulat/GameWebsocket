<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { io, Socket } from "socket.io-client";

type CellState = {
  revealed: boolean;
  hitDiamond: boolean;
  adjacentDiamonds: number;
};

type TurnResultPayload = {
  gameId: string;
  playerId: string;
  x: number;
  y: number;
  hitDiamond: boolean;
  adjacentDiamonds: number;
  nextPlayerId?: string;
  winnerId?: string;
  gameOver: boolean;
};

type JoinOkPayload = {
  gameId: string;
  size: number;
  diamonds: number;
  players: string[];
  currentPlayerId: string | null;
  winnerId?: string;
};

const API_BASE = "http://localhost:3005";
const WS_URL = API_BASE;

const socket = ref<Socket | null>(null);
const socketConnected = ref(false);

const gameId = ref<string | null>(null);
const playerId = ref<string>(crypto.randomUUID());
const size = ref<number | null>(null);
const diamonds = ref<number | null>(null);
const currentPlayerId = ref<string | null>(null);
const winnerId = ref<string | null>(null);

const players = ref<string[]>([]);

const joiningGameId = ref("");
const creatingGame = ref(false);
const joinInProgress = ref(false);
const errorMessage = ref<string | null>(null);

const lastTurnResult = ref<TurnResultPayload | null>(null);

const board = ref<CellState[]>([]);

const hasGame = computed(() => gameId.value !== null && size.value !== null);
const tiles = computed(() =>
  size.value
    ? Array.from({ length: size.value * size.value }, (_, i) => i)
    : [],
);

const isMyTurn = computed(
  () => currentPlayerId.value && currentPlayerId.value === playerId.value,
);

const hasWinner = computed(() => !!winnerId.value);
const didIWin = computed(
  () => winnerId.value !== null && winnerId.value === playerId.value,
);

const hasOpponent = computed(() => players.value.length >= 2);

function initBoard(newSize: number) {
  board.value = Array.from({ length: newSize * newSize }, () => ({
    revealed: false,
    hitDiamond: false,
    adjacentDiamonds: 0,
  }));
}

watch(size, (newSize) => {
  if (typeof newSize === "number" && newSize > 0) {
    initBoard(newSize);
  }
});

function connectSocket() {
  if (socket.value) return;

  const s = io(WS_URL, {
    transports: ["websocket"],
  });

  socket.value = s;

  s.on("connect", () => {
    socketConnected.value = true;
    errorMessage.value = null;
  });

  s.on("disconnect", () => {
    socketConnected.value = false;
  });

  s.on("join:ok", (payload: JoinOkPayload) => {
    gameId.value = payload.gameId;
    size.value = payload.size;
    diamonds.value = payload.diamonds;
    players.value = payload.players;
    currentPlayerId.value = payload.currentPlayerId;
    winnerId.value = payload.winnerId;
    errorMessage.value = null;
  });

  s.on("join:error", (payload: { message: string }) => {
    errorMessage.value = payload.message;
  });

  s.on("turn:result", (payload: TurnResultPayload) => {
    lastTurnResult.value = payload;

    if (!size.value) return;

    const index = payload.y * size.value + payload.x;
    if (!board.value[index]) return;

    board.value[index] = {
      revealed: true,
      hitDiamond: payload.hitDiamond,
      adjacentDiamonds: payload.adjacentDiamonds,
    };

    currentPlayerId.value = payload.nextPlayerId;
    winnerId.value = payload.winnerId;
  });

  s.on("game:players", (payload: { gameId: string; players: string[] }) => {
    if (payload.gameId !== gameId.value) return;
    players.value = payload.players;
  });
}

async function createGame() {
  if (creatingGame.value) return;
  creatingGame.value = true;
  errorMessage.value = null;

  try {
    if (!socket.value) {
      connectSocket();
    }

    // Simple fixed config for now; could be made configurable
    const response = await fetch(`${API_BASE}/game`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        size: 6,
        diamonds: 6,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create game (${response.status})`);
    }

    const data = (await response.json()) as {
      id: string;
      size: number;
      diamonds: number;
    };

    gameId.value = data.id;
    size.value = data.size;
    diamonds.value = data.diamonds;
    initBoard(data.size);

    // Automatically join as the creator
    socket.value?.emit("join", {
      gameId: data.id,
      playerId: playerId.value,
    });
  } catch (err: unknown) {
    errorMessage.value =
      err instanceof Error ? err.message : "Unknown error while creating game";
  } finally {
    creatingGame.value = false;
  }
}

function joinGame() {
  if (!socketConnected.value || joinInProgress.value) return;
  const id = joiningGameId.value.trim();
  if (!id) return;

  joinInProgress.value = true;
  errorMessage.value = null;

  try {
    socket.value?.emit("join", {
      gameId: id,
      playerId: playerId.value,
    });
  } finally {
    joinInProgress.value = false;
  }
}

function handleClick(index: number) {
  if (!hasGame.value || !socketConnected.value || !size.value || !gameId.value)
    return;
  if (!hasOpponent.value) return;
  if (!isMyTurn.value) return;
  if (hasWinner.value) return;

  const x = index % size.value;
  const y = Math.floor(index / size.value);

  socket.value?.emit("turn", {
    gameId: gameId.value,
    playerId: playerId.value,
    x,
    y,
  });
}

onMounted(() => {
  connectSocket();
});

onUnmounted(() => {
  socket.value?.disconnect();
  socket.value = null;
});
</script>

<template>
  <main class="page">
    <section class="board-wrapper">
      <h1 class="title">Diamond Hunt</h1>
      <p class="subtitle">
        Create a new game or join an existing one, then click tiles to reveal
        diamonds or hints.
      </p>

      <div class="controls">
        <button
          type="button"
          class="primary-button"
          @click="createGame"
          :disabled="creatingGame || !socketConnected"
        >
          {{ creatingGame ? "Creating…" : "Create Game" }}
        </button>

        <div class="join-controls">
          <input
            v-model="joiningGameId"
            class="join-input"
            type="text"
            placeholder="Game ID"
          />
          <button
            type="button"
            class="secondary-button"
            @click="joinGame"
            :disabled="!joiningGameId.trim() || !socketConnected"
          >
            Join Game
          </button>
        </div>
      </div>

      <div v-if="hasGame" class="game-info">
        <p class="info-line">
          <span class="label">Game ID:</span>
          <code class="pill">{{ gameId }}</code>
        </p>
        <p class="info-line" v-if="size">
          <span class="label">Board:</span>
          <span>{{ size }} × {{ size }}</span>
        </p>
        <p class="info-line" v-if="diamonds !== null">
          <span class="label">Diamonds:</span>
          <span>{{ diamonds }}</span>
        </p>
        <p class="info-line" v-if="currentPlayerId">
          <span class="label">Turn:</span>
          <span>
            <strong>
              {{ isMyTurn ? "You" : currentPlayerId }}
            </strong>
          </span>
        </p>
      </div>

      <p v-if="hasGame && currentPlayerId" class="info success">
        <span v-if="!hasOpponent">
          You joined the game. Waiting for another player to join.
        </span>
        <span v-else-if="isMyTurn">
          Both players joined. It’s your turn to play.
        </span>
        <span v-else>
          Both players joined. Waiting for
          <strong>{{ currentPlayerId }}</strong> to make a move.
        </span>
      </p>

      <p v-if="hasGame && hasWinner" class="info success">
        <span v-if="didIWin">
          🎉 You opened all diamonds and won the game!
        </span>
        <span v-else>
          Game over. Player <strong>{{ winnerId }}</strong> found all diamonds.
        </span>
      </p>

      <p v-if="!socketConnected" class="info warning">
        Connecting to game server…
      </p>
      <p v-if="errorMessage" class="info error">
        {{ errorMessage }}
      </p>

      <div
        v-if="hasGame && size"
        class="board"
        :style="{ gridTemplateColumns: `repeat(${size}, 1fr)` }"
      >
        <button
          v-for="index in tiles"
          :key="index"
          class="tile"
          type="button"
          @click="handleClick(index)"
          :disabled="!hasOpponent || !isMyTurn || !socketConnected || hasWinner"
        >
          <span v-if="board[index]?.revealed" class="tile-content">
            <span v-if="board[index].hitDiamond">💎</span>
            <span v-else>{{ board[index].adjacentDiamonds }}</span>
          </span>
        </button>
      </div>

      <p class="info" v-if="lastTurnResult">
        Last move:
        <strong>({{ lastTurnResult.x }}, {{ lastTurnResult.y }})</strong>
        –
        <span v-if="lastTurnResult.hitDiamond">hit a diamond!</span>
        <span v-else>
          {{ lastTurnResult.adjacentDiamonds }} diamonds around.
        </span>
      </p>
    </section>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #202938, #050712 55%);
  color: #f9fafb;
  font-family:
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.board-wrapper {
  padding: 2rem 2.5rem;
  border-radius: 1.25rem;
  background: rgba(15, 23, 42, 0.9);
  box-shadow:
    0 22px 45px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(148, 163, 184, 0.12);
}

.title {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 600;
}

.subtitle {
  margin: 0 0 1.5rem;
  font-size: 0.95rem;
  color: #9ca3af;
}

.controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.25rem;
}

.join-controls {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.primary-button,
.secondary-button {
  border-radius: 999px;
  border: none;
  padding: 0.5rem 1.1rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    background 150ms ease-out,
    color 150ms ease-out,
    box-shadow 150ms ease-out,
    transform 80ms ease-out;
}

.primary-button {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #022c22;
  box-shadow:
    0 10px 25px rgba(34, 197, 94, 0.45),
    0 0 0 1px rgba(22, 163, 74, 0.65);
}

.primary-button:hover:not(:disabled) {
  background: linear-gradient(135deg, #4ade80, #22c55e);
  transform: translateY(-1px);
}

.secondary-button {
  background: rgba(15, 23, 42, 0.9);
  color: #e5e7eb;
  border: 1px solid rgba(148, 163, 184, 0.7);
}

.secondary-button:hover:not(:disabled) {
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.5);
}

.primary-button:disabled,
.secondary-button:disabled {
  opacity: 0.55;
  cursor: default;
  box-shadow: none;
}

.join-input {
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.7);
  background: rgba(15, 23, 42, 0.9);
  color: #e5e7eb;
  font-size: 0.9rem;
  min-width: 10rem;
}

.join-input::placeholder {
  color: #6b7280;
}

.join-input:focus {
  outline: none;
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.4);
}

.game-info {
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  border-radius: 0.9rem;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.info-line {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.9rem;
  color: #d1d5db;
}

.label {
  color: #9ca3af;
}

.pill {
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.5);
  font-size: 0.8rem;
}

.board {
  display: grid;
  gap: 0.35rem;
  width: 320px;
  max-width: 80vw;
  aspect-ratio: 1 / 1;
}

.tile {
  border: 1px solid rgba(148, 163, 184, 0.45);
  border-radius: 0.35rem;
  background: radial-gradient(circle at top, #0f172a, #020617);
  cursor: pointer;
  transition:
    background 140ms ease-out,
    border-color 140ms ease-out,
    transform 80ms ease-out,
    box-shadow 140ms ease-out;
}

.tile:hover {
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.3);
}

.tile:active {
  transform: scale(0.97);
}

.tile:disabled {
  opacity: 0.6;
  cursor: default;
  box-shadow: none;
}

.tile-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  font-weight: 700;
  font-size: 1.1rem;
  color: #facc15;
}

.tile[data-active="true"] {
  border-color: #22c55e;
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.35);
  background: radial-gradient(circle at top, #166534, #022c22);
}

.info {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: #e5e7eb;
}

.info.warning {
  color: #fbbf24;
}

.info.error {
  color: #f87171;
}

.info.success {
  color: #4ade80;
}
</style>
