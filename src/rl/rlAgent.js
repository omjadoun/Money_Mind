// src/rl/rlAgent.js
// Savings-aware Q-learning agent (Option C).
// - Avoids recommending "buy_now" when savings are low
// - Exposes chooseAction() -> { action, ranking }
// - Exposes saveLast / getLast / update / reset
// - Persisted to localStorage

const STORAGE_KEY = "money_mind_rl_qtable_v3";
const LAST_KEY = "money_mind_rl_last_v3";

class RLAgent {
  constructor() {
    this.actions = ["buy_now", "buy_later", "split_payment", "reduce_other"];
    // hyperparameters
    this.alpha = 0.25; // learning rate
    this.gamma = 0.0; // discount (single-step)
    this.epsilon = 0.12; // exploration
    this.q = this._loadQ();
  }

  _loadQ() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (e) {
      console.warn("RLAgent: load error", e);
      return {};
    }
  }
  _saveQ() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.q));
    } catch (e) {
      console.warn("RLAgent: save error", e);
    }
  }

  // Discretize stateObj to reduce state-space
  _stateKey(stateObj) {
    // fields expected: monthly_income, savings, category_remaining, total_remaining, request_amount
    const income = Math.max(1, Number(stateObj.monthly_income) || 1);
    const savings = Number(stateObj.savings) || 0;
    const catRem = stateObj.category_remaining == null ? null : Number(stateObj.category_remaining);
    const totalRem = Number(stateObj.total_remaining) || income;
    const amount = Number(stateObj.request_amount) || 0;

    // normalize ratios
    const savingsPct = Math.max(0, Math.min(1, savings / income)); // 0..1
    const amountPct = Math.max(0, Math.min(2, amount / income)); // 0..2
    const catRemPct = catRem == null || isNaN(catRem) ? null : Math.max(-1, Math.min(2, catRem / Math.max(1, totalRem)));

    // buckets
    const sBucket = Math.floor(savingsPct * 4); // 0..4
    const aBucket = Math.floor(amountPct * 3); // 0..3
    const cBucket = catRemPct == null ? "NA" : Math.floor((catRemPct + 1) * 2); // map [-1..2] -> buckets

    return `s${sBucket}_c${cBucket}_a${aBucket}`;
  }

  _ensureStateKey(key) {
    if (!this.q[key]) {
      this.q[key] = {};
      for (const a of this.actions) this.q[key][a] = 0;
    }
  }

  // internal ranking helper
  _rankActionsForKey(key, safetyFilter = null) {
    this._ensureStateKey(key);
    const arr = Object.entries(this.q[key]).map(([action, score]) => ({ action, score }));
    // optionally apply safety filter: a function(action)=>boolean to hide actions
    let filtered = arr;    if (typeof safetyFilter === "function") {
      filtered = arr.filter((e) => safetyFilter(e.action));
      // include filtered-out actions at the end with -Infinity to preserve alternatives
      const excluded = arr.filter((e) => !safetyFilter(e.action)).map((e) => ({ action: e.action, score: -Infinity }));
      filtered = filtered.concat(excluded);
    }
    filtered.sort((a, b) => b.score - a.score);
    return filtered;
  }

  // chooseAction returns { action, ranking }
  // stateObj used to compute stateKey and also for safety decisions
  chooseAction(stateObj) {
    const key = this._stateKey(stateObj);
    this._ensureStateKey(key);

    // Safety policy (Option C): avoid recommending "buy_now" if savings are low
    // Define "low" as savingsPct < 0.15 (configurable)
    const income = Math.max(1, Number(stateObj.monthly_income) || 1);
    const savings = Number(stateObj.savings) || 0;
    const savingsPct = Math.max(0, Math.min(1, savings / income));
    const BUY_NOW_SAFETY_THRESHOLD = 0.15; // 15% of income

    // Safety filter function (returns true for allowed actions)
    const safetyFilter = (action) => {
      if (action === "buy_now" && savingsPct < BUY_NOW_SAFETY_THRESHOLD) {
        return false; // hide buy_now as recommended when savings too low
      }
      return true;
    };

    // epsilon-greedy exploration: pick a random allowed action (respect safety)
    if (Math.random() < this.epsilon) {
      const allowed = this.actions.filter(safetyFilter);
      // if nothing allowed (very unlikely) fallback to all actions
      const pool = allowed.length ? allowed : this.actions;
      const rand = pool[Math.floor(Math.random() * pool.length)];
      this.saveLast(key, rand, stateObj);
      return { action: rand, ranking: this._rankActionsForKey(key, safetyFilter) };
    }

    // choose best allowed action (apply safety filter)
    const ranking = this._rankActionsForKey(key, safetyFilter);
    // ranking sorted desc; the first may be -Infinity if all were filtered
    let chosen = ranking[0].action;
    // if top is -Infinity (i.e. filtered out) fallback to next with finite score
    const finite = ranking.find((r) => Number.isFinite(r.score));
    if (finite) chosen = finite.action;

    this.saveLast(key, chosen, stateObj);
    // return both chosen and full ranking (with filtered-out actions at end)
    return { action: chosen, ranking };
  }

  // update Q-table with single-step TD (reward typically +1 or -1)
  update(stateObj, action, reward = 0) {
    const key = this._stateKey(stateObj);
    this._ensureStateKey(key);
    const old = this.q[key][action] || 0;
    const nextMax = 0; // simplified single-step
    const newVal = old + this.alpha * (reward + this.gamma * nextMax - old);
    this.q[key][action] = newVal;
    this._saveQ();
    // clear last pointer
    try { localStorage.removeItem(LAST_KEY); } catch (e) {}
  }

  // public saveLast & getLast so chatbot can map feedback -> last suggestion
  saveLast(stateKeyOrKey, action, stateObj) {
    // accept either (stateKey, action, stateObj) or (key=null, action, stateObj)
    const entry = {
      stateKey: typeof stateKeyOrKey === "string" ? stateKeyOrKey : null,
      action,
      stateObj: stateObj || null,
      timestamp: Date.now(),
    };
    try {
      localStorage.setItem(LAST_KEY, JSON.stringify(entry));
    } catch (e) {
      console.warn("RLAgent: saveLast failed", e);
    }
  }

  getLast() {
    try {
      const raw = localStorage.getItem(LAST_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  reset() {
    this.q = {};
    this._saveQ();
    try { localStorage.removeItem(LAST_KEY); } catch (e) {}
  }
}

const agent = new RLAgent();
export default agent;