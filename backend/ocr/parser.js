// backend/ocr/parser.js
// Robust parsing utilities for OCR outputs (text-only + TSV-aware parseOcrResult)

const MONTH_MAP = {
  jan:1,january:1,feb:2,february:2,mar:3,march:3,apr:4,april:4,may:5,
  jun:6,june:6,jul:7,july:7,aug:8,august:8,sep:9,sept:9,september:9,
  oct:10,october:10,nov:11,november:11,dec:12,december:12
};

function pad(n){return n<10?`0${n}`:`${n}`;}
function todayIso(){const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;}
function toDisplay(isoYMD){ if(!isoYMD) return null; const [y,m,d]=isoYMD.split("-"); return `${pad(Number(d))}-${pad(Number(m))}-${y}`; }
function isoToEpochMs(isoYMD){ if(!isoYMD) return null; const dt=new Date(`${isoYMD}T00:00:00Z`); return Number.isNaN(dt.getTime())?null:dt.getTime(); }

// ---- Date parsing helpers ----
function parseNumericDateToken(token) {
  if(!token) return null;
  const cleaned = token.replace(/\s+/g,"").replace(/[\/\.]/g,"-");
  const parts = cleaned.split("-").map(p=>p.trim()).filter(Boolean);
  if(parts.length!==3) return null;
  let day=Number(parts[0]), month=Number(parts[1]), year=Number(parts[2]);
  if(parts[0].length===4){ year=Number(parts[0]); month=Number(parts[1]); day=Number(parts[2]); }
  else if(parts[2].length===4){ day=Number(parts[0]); month=Number(parts[1]); year=Number(parts[2]); }
  else if(parts[2].length===2){
    const yy=Number(parts[2]); const nowYY=new Date().getFullYear()%100;
    year=2000+yy; const thisYear=new Date().getFullYear(); if(year>thisYear+1) year=1900+yy;
    day=Number(parts[0]); month=Number(parts[1]);
  }
  if(![day,month,year].every(Number.isFinite)) return null;
  if(month<1||month>12) return null; if(day<1||day>31) return null;
  const thisYear=new Date().getFullYear();
  if(year>thisYear+1||year<1970) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseTextualDateToken(token) {
  if(!token) return null;
  const cleaned = token.replace(/,/g," ").replace(/\s+/g," ").trim();
  const parts = cleaned.split(" ").filter(Boolean);
  if(parts.length<2) return null;
  const partsClean = parts.map(p => p.replace(/(\d+)(st|nd|rd|th)\b/gi,"$1"));
  let monthIdx=-1;
  for(let i=0;i<partsClean.length;i++){
    const p=partsClean[i].toLowerCase();
    if(MONTH_MAP[p]) { monthIdx=i; break; }
    const short=p.slice(0,3);
    if(MONTH_MAP[short]) { monthIdx=i; break; }
  }
  if(monthIdx===-1) return null;
  let day=null, month=null, year=null;
  if(monthIdx===1){ day=Number(partsClean[0]); month=MONTH_MAP[partsClean[1].toLowerCase().slice(0,3)]||MONTH_MAP[partsClean[1].toLowerCase()]; year=partsClean.length>=3?Number(partsClean[2]):null; }
  else if(monthIdx===0){ month=MONTH_MAP[partsClean[0].toLowerCase().slice(0,3)]||MONTH_MAP[partsClean[0].toLowerCase()]; day=Number(partsClean[1]); year=partsClean.length>=3?Number(partsClean[2]):null; }
  else {
    for(const p of partsClean){
      if(/^\d{4}$/.test(p)) year=Number(p);
      else if(/^\d{1,2}$/.test(p) && day===null) day=Number(p);
      else if(/^\d{2}$/.test(p) && !year) year=2000+Number(p);
    }
    month=MONTH_MAP[partsClean[monthIdx].toLowerCase().slice(0,3)]||MONTH_MAP[partsClean[monthIdx].toLowerCase()];
  }
  if(year && String(year).length===2){ const yy=Number(year); const nowYY=new Date().getFullYear()%100; year=2000+yy; if(yy>nowYY+1) year=1900+yy; }
  if(!year) return null;
  if(![day,month,year].every(Number.isFinite)) return null;
  if(month<1||month>12) return null; if(day<1||day>31) return null;
  const thisYear=new Date().getFullYear();
  if(year>thisYear+1||year<1970) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

function normalizeNoisyDateString(s){
  if(!s) return s;
  const tokens = s.split(/(\s+|[,|;:()\[\]-])/g);
  const fixed = tokens.map(tok => {
    if(!tok) return tok;
    if(/[0-9\.\-\/:,]/.test(tok) || /[OlI|]/.test(tok)){
      let x = tok;
      x = x.replace(/(?<=\d)[Oo](?=\d)|(?<=\D)[Oo](?=\d)|(?<=\d)[Oo](?=\D)|^[Oo](?=\d)/g,"0");
      x = x.replace(/[Il|]/g,"1");
      x = x.replace(/[Ss]/g,"5");
      x = x.replace(/[,]/g,"-");
      return x;
    }
    return tok;
  });
  const joined = fixed.join("");
  return joined.replace(/[-\.\s]{2,}/g, m => m[0]).trim();
}

function safeParseNumericToken(token){
  if(!token) return null;
  let tkn = token.replace(/(\d)(st|nd|rd|th)\b/gi,"$1");
  tkn = tkn.replace(/[^0-9\.\-\/\s]/g,"");
  return parseNumericDateToken(tkn);
}

// ---- Numeric helpers ----
function normalizeNumberToken(token){
  if(!token) return null;
  let t = String(token).trim();
  t = t.replace(/[Il|]/g,"1");
  t = t.replace(/[Oo]/g,"0");
  t = t.replace(/[^\d.,-]/g,"");
  if(t.includes(",") && t.includes(".")) t = t.replace(/,/g,"");
  else if(t.includes(",") && /,[0-9]{2}$/.test(t)) t = t.replace(",",".");
  else t = t.replace(/,/g,"");
  const n = parseFloat(t);
  if(Number.isFinite(n)) return n;
  if(/^\d{3,}$/.test(t)){
    const t2 = `${t.slice(0,-2)}.${t.slice(-2)}`;
    const n2 = parseFloat(t2);
    if(Number.isFinite(n2)) return n2;
  }
  return null;
}

function normalizeGroupedDigits(s){
  if(!s) return s;
  let t = String(s);
  t = t.replace(/[Il\|]/g,"1").replace(/[Oo]/g,"0");
  t = t.replace(/[^\d,.\-\s]/g,"");
  t = t.replace(/(\d)\s+(\d)/g,"$1$2");
  t = t.replace(/\s{2,}/g," ");
  return t.trim();
}

// ---------------- findNumbersInText (keeps previous behavior) ----------------
export function findNumbersInText(text){
  if(!text) return [];
  const out = [];
  const regex = /(?:₹|Rs\.?|INR|\$|USD|EUR|€|£|Rs)\s*[-:]?\s*([0-9OolIlI][0-9OolIlI\s,\.]{0,20}[0-9OolIlI])/ig;
  let m;
  const foundSet = new Set();
  while((m = regex.exec(text)) !== null){
    const rawCapture = m[1].trim();
    const repaired = rawCapture.replace(/[Il\|]/g,"1").replace(/[Oo]/g,"0").replace(/[^\d,.\s-]/g,"");
    const normalized = normalizeGroupedDigits(repaired);
    let value = null;
    try {
      let t = normalized;
      if(t.includes(",") && t.includes(".")) t = t.replace(/,/g,"");
      else if(t.includes(",") && /,[0-9]{2}$/.test(t)) t = t.replace(",",".");
      else t = t.replace(/,/g,"");
      if(t===""||t==="-"||t===".") value = null;
      else value = parseFloat(t);
      if(!Number.isFinite(value)) value = null;
    } catch(e){ value = null; }
    if(value===null){
      const digitsOnly = normalized.replace(/[^\d]/g,"");
      if(/^\d{3,}$/.test(digitsOnly)){
        const t2 = `${digitsOnly.slice(0,-2)}.${digitsOnly.slice(-2)}`;
        const v2 = parseFloat(t2);
        if(Number.isFinite(v2)) value = v2;
      }
    }
    if(value!==null){
      const canonical = { raw: m[0].trim(), value: Number(Number(value).toFixed(2)), reparsed: normalized };
      const key = `${canonical.value}|${canonical.reparsed}`;
      if(!foundSet.has(key)){ foundSet.add(key); out.push(canonical); }
    }
  }
  // fallback: bare numbers
  if(out.length===0){
    const altRegex = /([0-9OolIlI][0-9OolIlI\s,\.]{0,20}[0-9OolIlI])/g;
    while((m = altRegex.exec(text)) !== null){
      const rawCapture = m[1].trim();
      if(rawCapture.length>1 && /[0-9]/.test(rawCapture)){
        const repaired = rawCapture.replace(/[Il\|]/g,"1").replace(/[Oo]/g,"0").replace(/[^\d,.\s-]/g,"");
        const normalized = normalizeGroupedDigits(repaired);
        let value = null;
        try {
          let t = normalized;
          if(t.includes(",") && t.includes(".")) t = t.replace(/,/g,"");
          else if(t.includes(",") && /,[0-9]{2}$/.test(t)) t = t.replace(",",".");
          else t = t.replace(/,/g,"");
          value = parseFloat(t);
          if(!Number.isFinite(value)) value = null;
        } catch(e){ value = null; }
        if(value===null){
          const digitsOnly = normalized.replace(/[^\d]/g,"");
          if(/^\d{3,}$/.test(digitsOnly)){
            const t2 = `${digitsOnly.slice(0,-2)}.${digitsOnly.slice(-2)}`;
            const v2 = parseFloat(t2);
            if(Number.isFinite(v2)) value = v2;
          }
        }
        if(value!==null){
          const canonical = { raw: m[0].trim(), value: Number(Number(value).toFixed(2)), reparsed: normalized };
          const key = `${canonical.value}|${canonical.reparsed}`;
          if(!foundSet.has(key)){ foundSet.add(key); out.push(canonical); }
        }
      }
    }
  }
  return out;
}

// ---------------- repair helpers (kept) ----------------
function generateRepairCandidatesForRepeatedLeadingDigits(rawNumberStr) {
  if(!rawNumberStr) return [];
  const s = String(rawNumberStr).replace(/[^\d.]/g,"");
  if(!s) return [];
  const candidates = new Set();
  const dotIndex = s.indexOf(".");
  let intPart = dotIndex===-1? s: s.slice(0,dotIndex);
  const fracPart = dotIndex===-1? "": s.slice(dotIndex);
  if(/^([0-9])\1/.test(intPart)){ candidates.add(intPart.slice(1)+fracPart); }
  const match = intPart.match(/^([0-9])\1{1,}/);
  if(match){ const runDigit = match[1]; const newInt = intPart.replace(new RegExp(`^${runDigit}{1}`), ""); if(newInt.length>0) candidates.add(newInt+fracPart); }
  if(intPart.length>2){ candidates.add(intPart.slice(1)+fracPart); candidates.add(intPart.slice(2)+fracPart); }
  try{ candidates.add(String((parseFloat(s)/10))); }catch{}
  try{ candidates.add(String((parseFloat(s)/100))); }catch{}
  const out = [];
  for(const c of candidates){ const val=parseFloat(c); if(Number.isFinite(val) && val>=0) out.push(Number(Number(val).toFixed(2))); }
  return Array.from(new Set(out));
}

function repairGrosslyLargeCandidate(candidateValue, expectedNet){
  if(!Number.isFinite(candidateValue)) return candidateValue;
  if(candidateValue<=0) return candidateValue;
  const repairCandidates = [];
  repairCandidates.push(Number((candidateValue/10).toFixed(2)));
  repairCandidates.push(Number((candidateValue/100).toFixed(2)));
  repairCandidates.push(Number((candidateValue/1000).toFixed(2)));
  const rawStr = String(candidateValue);
  const repeatedCandidates = generateRepairCandidatesForRepeatedLeadingDigits(rawStr);
  repeatedCandidates.forEach(c=>repairCandidates.push(c));
  try{
    const centsStr = String(Math.round(candidateValue*100));
    for(let rm=1; rm<=2; rm++){
      if(centsStr.length>rm+2){
        const s2 = centsStr.slice(rm);
        const v2 = parseFloat(s2.slice(0,-2)+"."+s2.slice(-2));
        if(Number.isFinite(v2) && v2>0) repairCandidates.push(Number(v2.toFixed(2)));
      }
    }
  }catch(e){}
  const uniq = Array.from(new Set(repairCandidates.filter(c=>Number.isFinite(c)&&c>0)));
  if(Number.isFinite(expectedNet)){
    uniq.sort((a,b)=>Math.abs(a-expectedNet)-Math.abs(b-expectedNet));
    const best = uniq.length? uniq[0] : candidateValue;
    if(uniq.length && Math.abs(best-expectedNet)<=Math.max(2, expectedNet*0.05)) return best;
    if(candidateValue > expectedNet * 3){ return uniq.length? uniq[0] : candidateValue; }
  } else {
    if(uniq.length){ uniq.sort((a,b)=>a-b); return uniq[0]; }
  }
  return candidateValue;
}

// ---------------- core total extraction (original logic) ----------------
export function extractTotalFromText(text){
  if(!text) return null;
  const lines = text.split(/\n/).map(l=>l.trim()).filter(Boolean);
  const totalLabels = [
    "grand total","grandtotal","total payable","amount payable","amt payable","amount due","amt due","amount paid","amt paid",
    "amount:", "amount -", "net payable","net amount","net total","net amt","total amount","total:","total -","total due",
    "balance due","balance","amount to pay","amount to be paid","payable"
  ];

  const labelledCandidates = [];
  for(let i=0;i<lines.length;i++){
    const low = lines[i].toLowerCase();
    for(const lbl of totalLabels){
      if(low.includes(lbl)){
        const localNums = findNumbersInText(lines[i]);
        if(localNums.length){
          for(const n of localNums) labelledCandidates.push({ value:n.value, raw:n.raw, lineIdx:i, reason:"label_same_line" });
        } else {
          const nextLine = lines[i+1]||"";
          const nextNums = findNumbersInText(nextLine);
          if(nextNums.length) labelledCandidates.push({ value: nextNums[0].value, raw: nextNums[0].raw, lineIdx:i+1, reason:"label_next_line" });
          else {
            const fallbackNums = (lines[i].match(/([0-9OolIlI][0-9OolIlI\s,\.]{0,20}[0-9OolIlI])/g) || []);
            for(const f of fallbackNums){
              const repaired = normalizeGroupedDigits(f.replace(/[Il\|]/g,"1").replace(/[Oo]/g,"0"));
              const v = normalizeNumberToken(repaired);
              if(Number.isFinite(v)) labelledCandidates.push({ value: v, raw: f, lineIdx:i, reason:"label_fallback" });
            }
          }
        }
      }
    }
  }

  if(labelledCandidates.length){
    labelledCandidates.sort((a,b)=>a.lineIdx-b.lineIdx);
    const chosen = labelledCandidates[labelledCandidates.length-1];
    return { raw: chosen.raw, value: Number(Number(chosen.value).toFixed(2)), reason: "label_priority_last", subtotal: null, taxes: [] };
  }

  let subtotal = null;
  for(const line of lines){
    const lower = line.toLowerCase();
    if(/\bsub\s*total\b/i.test(lower) || /\bsubtotal\b/i.test(lower)){
      const n = findNumbersInText(line);
      if(n.length){ subtotal = n.at(-1).value; break; }
    }
  }

  const taxes = [];
  for(const line of lines){
    const lower = line.toLowerCase();
    if(/(gst|cgst|sgst|tax)/i.test(lower)){
      const n = findNumbersInText(line);
      if(n.length){
        for(const item of n){
          let val = item.value;
          if(!String(item.raw).includes(".") && val>=100){
            const maybe = val/100;
            if(maybe<10000) val = maybe;
          }
          taxes.push({ raw: item.raw, value: val });
        }
      }
    }
  }

  const netCandidates = [];
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    const lower = line.toLowerCase();
    if(/\b(total|amount|net|payable|due|balance)\b/.test(lower)){
      const nums = findNumbersInText(line);
      for(const n of nums) netCandidates.push({ value:n.value, raw:n.raw, idx:i, line });
    }
  }

  if(netCandidates.length===0){
    const allNums = findNumbersInText(text);
    if(allNums.length){
      for(let i=0;i<allNums.length;i++){
        netCandidates.push({ value: allNums[i].value, raw: allNums[i].raw, idx: i + lines.length, line: null });
      }
    }
  }

  let expectedNet = null;
  if(subtotal!==null){
    const taxSum = taxes.reduce((s,t)=>s+(Number(t.value)||0),0);
    expectedNet = Number((subtotal + taxSum).toFixed(2));
  }

  if(netCandidates.length===0){
    if(expectedNet!==null){
      return { raw: String(expectedNet), value: expectedNet, reason: "computed_from_subtotal_and_taxes", subtotal, taxes };
    }
    return null;
  }

  netCandidates.forEach(c => {
    c.score = 0;
    c.score += (100 - (c.idx || 0));
    if(Math.abs(c.value - Math.round(c.value)) > 0.001 || String(c.value).includes(".")) c.score += 10;
    if(expectedNet!==null) c.score += Math.max(0, 50 - Math.abs(c.value - expectedNet));
    if(c.idx && c.idx >= lines.length - 3) c.score += 10;
  });

  netCandidates.sort((a,b) => b.score - a.score);
  let best = netCandidates[0];

  if(expectedNet!==null && Number.isFinite(best.value)){
    const diff = Math.abs(best.value - expectedNet);
    if(diff > Math.max(2, expectedNet * 0.05)){
      const repaired = repairGrosslyLargeCandidate(best.value, expectedNet);
      if(Number.isFinite(repaired) && Math.abs(repaired - expectedNet) <= Math.max(2, expectedNet * 0.05)){
        best = {...best, value: repaired, raw: `${best.raw} (repaired)`};
        return { raw: best.raw, value: Number(Number(best.value).toFixed(2)), reason: "repaired_candidate_near_expected", subtotal, taxes };
      } else {
        return { raw: String(expectedNet), value: expectedNet, reason: "computed_from_subtotal_and_taxes", subtotal, taxes };
      }
    }
  }

  return { raw: best.raw, value: Number(Number(best.value).toFixed(2)), reason: "ranked_candidate", subtotal, taxes };
}

// ---------------- date extraction (kept) ----------------
export function extractDateFromLabels(text){
  if(!text) return null;
  const labelRegex = /\b(?:dt|date|bill date|invoice date|txn date|transaction date|date of purchase|date:)\s*[:\-]?\s*([^\n\r]{5,40})/i;
  const m = text.match(labelRegex);
  if(m && m[1]){
    const candidate = m[1].trim();
    const firstPart = candidate.split(/\s{2,}|\s(?=\d{2}[:.]\d{2})/)[0].trim();
    const numericMatch = firstPart.match(/(\d{1,4}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{2,4})/);
    if(numericMatch){ const iso=parseNumericDateToken(numericMatch[1]); if(iso) return { iso, raw: numericMatch[1], reason:"label_match_numeric" }; }
    const textualMatch = firstPart.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s*,?\s*[0-9]{2,4})/i);
    if(textualMatch){ const iso=parseTextualDateToken(textualMatch[0]); if(iso) return { iso, raw: textualMatch[0], reason:"label_match_textual" }; }
    const tryIso = safeParseNumericToken(firstPart);
    if(tryIso) return { iso: tryIso, raw: firstPart, reason:"label_fallback" };
  }
  return null;
}

export function extractDateFromText(text){
  if(!text) return null;
  const labelRes = extractDateFromLabels(text);
  if(labelRes) return labelRes;
  const t0 = text.replace(/\|/g,"I");
  const allLines = t0.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const headerKeywords = ["receipt","terminal","invoice","bill","txn","transaction"];
  const headerIndexes = [];
  for(let i=0;i<Math.min(12,allLines.length);i++){
    const lc = allLines[i].toLowerCase();
    for(const kw of headerKeywords) if(lc.includes(kw)) headerIndexes.push(i);
  }
  function score(lineIndex, normalized){
    let s = Math.max(0, 100 - lineIndex*2);
    for(const hi of headerIndexes){
      const d = Math.abs(hi - lineIndex);
      if(d===0) s += 40;
      else if(d<=2) s += 20 - d*5;
    }
    if(normalized) s += 8;
    return s;
  }
  const numericRegex = /(\d{1,4}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{2,4})(?:\s*(?:[01]?\d|2[0-3])[:.][0-5]\d(?:\s?[AaPp][Mm])?)?/g;
  const textualRegex = /(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s*,?\s*[0-9]{2,4})|((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*[0-9]{2,4})/ig;
  const candidates = [];
  for(let i=0;i<allLines.length;i++){
    const line = allLines[i];
    for(const m of [...line.matchAll(numericRegex)]) { candidates.push({ token: m[1], idx:i, normalized:false, score: score(i,false), source:line }); const normLine = normalizeNoisyDateString(line); if(normLine!==line) for(const nm of [...normLine.matchAll(numericRegex)]) candidates.push({ token: nm[1], idx:i, normalized:true, score: score(i,true)+2, source: normLine }); }
    for(const m of [...line.matchAll(textualRegex)]) { candidates.push({ token: m[0], idx:i, normalized:false, score: score(i,false), source:line }); const normLine = normalizeNoisyDateString(line); if(normLine!==line) for(const nm of [...normLine.matchAll(textualRegex)]) candidates.push({ token: nm[0], idx:i, normalized:true, score: score(i,true)+2, source: normLine }); }
  }
  if(candidates.length===0){
    const tnorm = normalizeNoisyDateString(t0);
    for(const m of [...tnorm.matchAll(numericRegex)]) candidates.push({ token: m[1], idx: allLines.length, normalized: true, score: 30, source: tnorm });
    for(const m of [...tnorm.matchAll(textualRegex)]) candidates.push({ token: m[0], idx: allLines.length, normalized: true, score: 30, source: tnorm });
  }
  if(candidates.length===0) return null;
  const parsed = [];
  for(const c of candidates){
    let iso = parseNumericDateToken(c.token);
    if(!iso) iso = safeParseNumericToken(c.token);
    if(!iso){
      const tclean = c.token.replace(/(\d+)(st|nd|rd|th)\b/gi,"$1");
      iso = parseTextualDateToken(tclean);
    }
    if(!iso){
      const tclean2 = c.token.replace(/[,]/g," ").replace(/[^A-Za-z0-9 \-]/g," ");
      iso = parseTextualDateToken(tclean2);
    }
    if(iso) parsed.push({ iso, raw: c.token, idx: c.idx, score: c.score, normalized: c.normalized, source: c.source });
  }
  if(parsed.length===0) return null;
  parsed.sort((a,b)=>{ if(b.score!==a.score) return b.score-a.score; return a.idx-b.idx; });
  const best = parsed[0];
  return { iso: best.iso, raw: best.raw, reason: "ranked", score: best.score, sourceLine: best.source };
}

// ---------------- normalize OCR symbols ----------------
export function normalizeOcrSymbols(text, opts = { preferINR: true }){
  if(!text) return "";
  let t = text;
  t = t.replace(/\|/g,"I").replace(/[\[\]\}]/g,"").replace(/\.{2,}/g," ... ");
  t = t.replace(/Thank you[^\w\s]*$/i, "Thank you!");
  const matches = [...t.matchAll(/([£$₹€£RXxIlI])\s*(?=\d{1,3}([.,]\d{2})?)/g)];
  const symbols = new Set(matches.map(m=>m[1]));
  if(opts.preferINR && symbols.size>0){
    t = t.replace(/([RXxIlI£])(?=\d)/g,"₹");
  }
  return t.replace(/[^\x00-\x7F₹€£$.,:\-\n\sA-Za-z0-9]/g,"");
}

// ---------------- debug helper ----------------
export function debugNumericAndTotal(text, tag=""){
  try{
    const nums = findNumbersInText(text || "");
    const total = extractTotalFromText(text || "");
    console.log(`DEBUG${tag? " ["+tag+"]":""}: numeric candidates ->`, nums);
    console.log(`DEBUG${tag? " ["+tag+"]":""}: total extraction ->`, total);
  } catch(e){ console.warn("DEBUG: failed to compute debug info:", e); }
}

// ---------------- text-only parse wrapper (kept) ----------------
export function parseReceiptText(text){
  const cleaned = String(text || "").replace(/\r/g,"\n");
  const lines = cleaned.split(/\n/).map(l=>l.trim()).filter(Boolean);
  const merchant = lines[0] || "";
  const amounts = findNumbersInText(cleaned);
  const totalInfo = extractTotalFromText(cleaned);
  const dateInfo = extractDateFromText(cleaned);
  const finalDateIso = dateInfo ? dateInfo.iso : todayIso();
  return {
    merchant,
    amountCandidates: amounts,
    total: totalInfo ? { raw: totalInfo.raw, value: totalInfo.value, reason: totalInfo.reason, subtotal: totalInfo.subtotal, taxes: totalInfo.taxes } : null,
    date: finalDateIso,
    dateRaw: dateInfo ? dateInfo.raw : null,
    dateExtractReason: dateInfo ? dateInfo.reason : "fallback:today",
    linesCount: lines.length
  };
}

// ---------------- TSV-aware parsing ----------------
export function parseOcrResult({ text = "", words = null } = {}) {
  const rawLines = String(text || "").split(/\r?\n/).map(l=>l.trim()).filter(Boolean);

  function makeWordsWithLineIndex(wordsArr = []) {
    if(!Array.isArray(wordsArr) || wordsArr.length===0) return [];
    const withY = wordsArr.map((w,i) => {
      const bbox = w.bbox || w.boundingBox || w.box || {};
      const y0 = bbox.y0 ?? bbox.top ?? bbox.y ?? 0;
      const y1 = bbox.y1 ?? bbox.bottom ?? (bbox.y ? (bbox.y + (bbox.h || 0)) : (bbox.height || 0)) ?? y0;

      const midY = (Number(y0) + Number(y1))/2 || 0;
      return { ...w, midY, originalIndex: i };
    });
    withY.sort((a,b)=>a.midY - b.midY);
    const lines = [];
    const tol = 8;
    withY.forEach(w => {
      const last = lines[lines.length-1];
      if(!last || Math.abs(w.midY - last.midY) > tol) lines.push({ midY: w.midY, words: [w] });
      else { last.words.push(w); last.midY = last.words.reduce((s,x)=>s+x.midY,0)/last.words.length; }
    });
    const wordsWithLine = [];
    lines.forEach((ln, idx) => ln.words.forEach(w => wordsWithLine.push({ ...w, lineIndex: idx })));
    wordsWithLine.sort((a,b)=>a.originalIndex - b.originalIndex);
    return wordsWithLine;
  }

  const lineCandidates = [];
  for(let i=0;i<rawLines.length;i++){
    const line = rawLines[i];
    const matches = [...line.matchAll(/([₹Rs$£€]?\s*[0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+(?:\.[0-9]{1,2})?)/g)];
    for(const m of matches){
      const token = m[0];
      const value = normalizeNumberToken(token);
      if(value===null) continue;
      if(/\b\d{6,12}\b/.test(token)) continue;
      if(/\b(19|20)\d{2}\b/.test(line) && value>=1900 && value<=2100) continue;
      lineCandidates.push({ value, token, lineIndex: i, lineText: line, keyword: /\b(grand\s*total|total|amount|payable|due|balance)\b/i.test(line) });
    }
    if(/^[-+]?[\d\s,]{1,15}(\.\d{1,2})?$/.test(line)){
      const v = normalizeNumberToken(line);
      if(v!==null) lineCandidates.push({ value:v, token: line, lineIndex: i, lineText: line, keyword: /\b(grand\s*total|total|amount|payable|due|balance)\b/i.test(line) });
    }
  }

  const wordCandidates = [];
  const wordsWithLine = makeWordsWithLineIndex(words || []);
  if(wordsWithLine.length){
    for(const w of wordsWithLine){
      const token = String(w.text || "");
      const value = normalizeNumberToken(token);
      if(value===null) continue;
      if(/\b\d{6,12}\b/.test(token)) continue;
      if(/\b(19|20)\d{2}\b/.test(token) && value>=1900 && value<=2100) continue;
      wordCandidates.push({ value, token, lineIndex: w.lineIndex ?? null, conf: typeof w.conf === "number"? w.conf : (w.confidence || null), bbox: w.bbox||null, keyword: /\b(grand\s*total|total|amount|payable|due|balance)\b/i.test(w.text || "") });
    }
  }

  const allCandidates = [...lineCandidates, ...wordCandidates];

  const map = new Map();
  allCandidates.forEach(c => {
    const key = `${c.value}_${c.lineIndex ?? "nl"}_${String(c.token).slice(0,12)}`;
    if(!map.has(key)) map.set(key, c);
  });
  const candidates = Array.from(map.values());

  const maxLine = rawLines.length - 1;
  const scored = candidates.map(c => {
    let score = 0;
    if(c.keyword) score += 45;
    if(typeof c.lineIndex === "number"){
      const dist = maxLine - c.lineIndex;
      if(dist>=0 && dist<=6) score += Math.max(0,(6 - dist) * 4);
    }
    if(c.conf) score += Math.min(25, (c.conf/100) * 20);
    score += Math.min(25, Math.log10(Math.max(1, c.value)) * 5);
    score += (c.lineIndex ?? maxLine) / Math.max(1, maxLine || 1);
    return { ...c, score: Math.round(score*100)/100 };
  });

  scored.sort((a,b)=>{
    if(b.score!==a.score) return b.score - a.score;
    return b.value - a.value;
  });

  let chosen = scored[0] ?? null;
  if(scored.length>1){
    const kw = scored.find(s => s.keyword);
    if(kw && (!chosen || kw.score >= (chosen.score - 8) || kw.score > chosen.score * 0.7)) chosen = kw;
  }

  if((!chosen || !Number.isFinite(chosen.value) || chosen.value <= 0) && scored.length){
    const positives = scored.filter(s => s.value > 0);
    if(positives.length) chosen = positives.reduce((a,b) => b.value > a.value ? b : a, positives[0]);
  }

  const vendorCandidates = rawLines.slice(0,4).filter(l => !/^[-+]?[\d\s,]{1,15}(\.\d{1,2})?$/.test(l)).slice(0,2);

  const dateRes = extractDateFromText(text);
  const dateCandidates = dateRes ? [dateRes] : [];

  const candidateOut = scored.map(s => ({
    value: s.value,
    token: s.token,
    lineIndex: s.lineIndex,
    conf: s.conf ?? null,
    keyword: Boolean(s.keyword),
    score: s.score,
    lineText: s.lineText ?? null
  }));

  return {
    amount: chosen && Number.isFinite(chosen.value) ? chosen.value : 0,
    chosen: chosen ? { value: chosen.value, token: chosen.token, lineIndex: chosen.lineIndex, conf: chosen.conf ?? null, score: chosen.score } : null,
    candidates: candidateOut,
    vendorCandidates,
    dateCandidates,
    rawLines,
    debug: { candidateCount: candidateOut.length, sampleLines: rawLines.slice(0,40) }
  };
}

export { todayIso, toDisplay, isoToEpochMs };
