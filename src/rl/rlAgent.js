// src/rl/rlAgent.js
// Simple Q-learning agent persisted to localStorage.
// Lightweight and deterministic — good for a demo/mini project.

const STORAGE_KEY = "money_mind_rl_qtable_v1";
const LAST_KEY = "money_mind_rl_last_v1";

class RLAgent {
  constructor() {
    this.actions = ["buy_now", "buy_later", "split_payment", "reduce_other"];
    this.alpha = 0.25; // learning rate
    this.gamma = 0.8;  // discount factor
    this.epsilon = 0.12; // exploration probability
    this.q = this._loadQ();
  }

  _loadQ() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      console.warn("RLAgent: failed to load qtable", e);
      return {};
    }
  }

  _saveQ() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.q));
    } catch (e) {
      console.warn("RLAgent: failed to save qtable", e);
    }
  }

  // stateObj: small object. We discretize it to reduce state-space.
  _stateKey(stateObj) {
    // important fields we bucket:
    // savingsPct: savings / income (0..1) -> bucket 0..5
    // catRemainPct: category_remaining / total_remaining (or absolute) -> bucket 0..5
    // amountBucket: amount / income -> bucket 0..4
    const income = Math.max(1, Number(stateObj.monthly_income) || 1);
    const savings = Number(stateObj.savings) || 0;
    const catRem = Number(stateObj.category_remaining);
    const totalRem = Number(stateObj.total_remaining) || income;

    const savingsPct = Math.max(0, Math.min(1, savings / income));
    const catRemPct = isNaN(catRem) ? -1 : Math.max(0, Math.min(2, catRem / Math.max(1, totalRem)));
    const amount = Number(stateObj.request_amount) || 0;
    const amountPct = Math.max(0, Math.min(2, amount / income));

    const sBucket = Math.floor(savingsPct * 5); // 0..5
    const cBucket = catRem === null || isNaN(catRem) ? "NA" : Math.floor(catRemPct * 5); // 0..5 or NA
    const aBucket = Math.floor(amountPct * 3); // 0..3

    return `s${sBucket}_c${cBucket}_a${aBucket}`;
  }

  _ensureStateKey(key) {
    if (!this.q[key]) {
      this.q[key] = {};
      for (const a of this.actions) this.q[key][a] = 0;
    }
  }

  // choose an action given state. stateObj must include request_amount, savings, monthly_income, category_remaining, total_remaining
  chooseAction(stateObj) {
    const key = this._stateKey(stateObj);
    this._ensureStateKey(key);

    // epsilon-greedy
    if (Math.random() < this.epsilon) {
      const r = this.actions[Math.floor(Math.random() * this.actions.length)];
      this._saveLast(key, r, stateObj);
      return r;
    }

    // choose best
    const actions = this.q[key];
    let best = this.actions[0];
    let bestVal = actions[best];
    for (const a of this.actions) {
      const v = actions[a];
      if (v > bestVal) {
        best = a;
        bestVal = v;
      }
    }
    this._saveLast(key, best, stateObj);
    return best;
  }

  // update Q-table using reward and optional nextState (we ignore nextState complexity to keep it simple)
  update(stateObj, action, reward = 0) {
    const key = this._stateKey(stateObj);
    this._ensureStateKey(key);
    const old = this.q[key][action] || 0;

    // simple TD update with nextMax = 0 (since next state not modeled here)
    const nextMax = 0;
    const newVal = old + this.alpha * (reward + this.gamma * nextMax - old);
    this.q[key][action] = newVal;
    this._saveQ();
    // clear last
    try { localStorage.removeItem(LAST_KEY); } catch (e) {}
  }

  // persist last suggested action (so feedback can map to it)
  _saveLast(stateKey, action, stateObj) {
    const entry = {
      stateKey,
      action,
      stateObj,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(entry));
    } catch (e) {
      console.warn("RLAgent: failed to save last", e);
    }
  }

  // return last suggestion (so chatbot can ask user for feedback or update)
  getLast() {
    try {
      const raw = localStorage.getItem(LAST_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // manual helper to reset Q-table (useful in dev)
  reset() {
    this.q = {};
    this._saveQ();
    try { localStorage.removeItem(LAST_KEY); } catch (e) {}
  }
}

const agent = new RLAgent();
export default agent;
