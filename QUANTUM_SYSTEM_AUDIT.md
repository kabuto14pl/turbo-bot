# 🔬 KRYTYCZNY AUDYT SYSTEMU KWANTOWEGO — Turbo-Bot v6.0.0

**Data:** 2026-02-21  
**Audytor:** Skynet Architect (Copilot Agent)  
**Scope:** Wszystkie 4 pliki kwantowe + integracja w bot.js  
**Status:** 14 issues znalezionych (2× P0, 5× P1, 7× P2)

---

## 📊 PRZEGLĄD AUDYTOWANYCH PLIKÓW

| Plik | LOC | Status |
|------|-----|--------|
| `trading-bot/src/core/ai/hybrid_quantum_pipeline.js` | 2033 | 6 issues |
| `trading-bot/src/core/ai/quantum_optimizer.js` | 827 | 3 issues |
| `trading-bot/src/core/ai/quantum_gpu_sim.js` | 203 | **KOMPLETNIE ZEPSUTY** |
| `trading-bot/src/core/ai/quantum_position_manager.js` | 1454 | 2 issues |

---

## 🔴 P0 — KRYTYCZNE (System-Breaking)

---

### P0-1: `quantum_gpu_sim.js` — CAŁY MODUŁ JEST ZEPSUTY (9 fundamentalnych błędów)

**Plik:** `quantum_gpu_sim.js` (203 LOC)  
**Impact:** Jeśli ktoś zaimportuje ten moduł, podmieni działający `QuantumState` CPU na zepsutą wersję GPU.  
**Obecny risk:** NISKI — bot.js NIE importuje tego pliku. Tylko `test_quantum_gpu.js` go używa.

**Lista błędów:**

1. **Zły import TF.js (linia 7):** `require('@tensorflow/tfjs-node-gpu')` — bot używa `@tensorflow/tfjs-node` (CPU). Bez zainstalowanego CUDA i pakietu GPU, `require()` crashuje.

2. **Konstruktor produkuje stan zerowy (linia 28):** `this.state.dataSync()[0] = 1.0` — metoda `dataSync()` zwraca **KOPIĘ** danych tensora, nie referencję. Zapis do kopii nie modyfikuje oryginału. Stan kwantowy zostaje jako same zera zamiast |0...0⟩.

3. **Hadamard gate — out of bounds (linia 106):** `gate.dataSync()[idx0 + this.dim*2]` — tensor ma kształt `[dim, 2]`, więc `dataSync()` ma `dim * 2` elementów. Zapis pod indeksem `idx0 + dim*2` wychodzi poza tablicę.

4. **Phase gate — źle obliczone indeksy (linia 121):** Tensor `tf.eye(this.dim).expandDims(-1).tile([1,1,2])` ma kształt `[dim, dim, 2]`, ale obliczenie indeksu `i * 2 * this.dim + i * 2` nie odpowiada layoutowi 3D tensora. Próba modyfikacji przez `dataSync()` (kopia) i tak nie zadziała.

5. **Mnożenie zespolone jest MATEMATYCZNIE BŁĘDNE (linia 171-174):** 
   ```javascript
   // OBECNE (BŁĘDNE):
   real.matMul(gate_real)   // ← to daje Re×Re
   imag.matMul(gate_imag)   // ← to daje Im×Im
   
   // POPRAWNE powinno być:
   // newReal = Re×gateRe - Im×gateIm
   // newImag = Re×gateIm + Im×gateRe
   ```
   Brak termów krzyżowych oznacza, że ŻADNA operacja kwantowa nie działa poprawnie.

6. **`tf.clipByValue(state, -1, 1)` (linia 176):** Niszczy amplitudy kwantowe. Amplitudy mogą mieć wartości |α| > 1 w stanach pośrednich (przed renormalizacją). Obcinanie do [-1, 1] łamie unitarność operacji.

7. **Niespójne kształty gate'ów:** Hadamard zwraca `[dim, 2]`, Phase zwraca `[dim, dim, 2]`, CNOT zwraca `[dim, dim, 2]`. `_applyGate()` nie obsługuje obu kształtów jednocześnie — `matMul` wymaga spójnych wymiarów.

8. **Wycieki pamięci:** Tensory tworzone w `_getHadamardGate`, `_getPhaseGate`, `_getCnotGate` nie są usuwane (brak `dispose()`). Tylko `dispose()` klasy czyści cache, nie pośrednie tensory.

9. **Niebezpieczny export (linia 197):** `module.exports = { QuantumState: GPU_ENABLED ? GPUQuantumState : QuantumState }` — jeśli GPU się załaduje, cicho podmienia DZIAŁAJĄCY `QuantumState` CPU na ZEPSUTY GPU. Każdy import `QuantumState` z tego pliku dostanie błędną implementację.

**Rekomendacja:** Usunąć `quantum_gpu_sim.js` lub oznaczyć jako `DEPRECATED/DO NOT USE`. Moduł nie jest używany w produkcji i każda próba użycia spowoduje błędne wyniki lub crash.

---

### P0-2: VQC Variational Layers — `phaseShift()` zamiast `Ry` (utrata ~2/3 ekspresywności)

**Plik:** `hybrid_quantum_pipeline.js`, linie 673-678  
**Klasa:** `VariationalQuantumClassifier.classify()`

```javascript
// OBECNY KOD (linie 675-677):
qs.phaseShift(q, this.params[paramIdx++]); // Ry  ← KOMENTARZ KŁAMIE
qs.phaseShift(q, this.params[paramIdx++]); // Rz
qs.phaseShift(q, this.params[paramIdx++]); // Ry  ← KOMENTARZ KŁAMIE
```

**Problem:** `phaseShift()` implementuje bramkę **Rz** (obrót fazy), NIE **Ry** (obrót na osi Y). Trzy kolejne bramki Rz na tym samym kubicie redukują się do jednej:

$$Rz(\theta_1) \cdot Rz(\theta_2) \cdot Rz(\theta_3) = Rz(\theta_1 + \theta_2 + \theta_3)$$

To oznacza, że zamiast zamierzonych **36 efektywnych parametrów** (4 kubity × 3 warstwy × 3 obroty), VQC ma efektywnie **12 parametrów** (4 kubity × 3 warstwy × 1 Rz). Ekspresywność obwodu jest dramatycznie zredukowana.

**Impact:** Klasyfikator reżimów (TRENDING_UP/DOWN, RANGING, HIGH_VOLATILITY) ma **~1/3 zamierzonej zdolności** rozróżniania stanów. To wpływa na:
- QPM Dynamic SL/TP (reżim determinuje mnożniki SL/TP)
- Position Health Scoring (20% wagi to czynnik reżimu)
- Partial Close Advisor (adverse regime triggers)
- Ensemble threshold modyfikacje (pośrednio przez QAOA)

**Rekomendacja:** Zaimplementować prawdziwą bramkę `Ry` w `QuantumState`:
```javascript
// Ry(θ) = [[cos(θ/2), -sin(θ/2)], [sin(θ/2), cos(θ/2)]]
ry(qubit, theta) {
    const step = 1 << qubit;
    const cosH = Math.cos(theta / 2);
    const sinH = Math.sin(theta / 2);
    const newAmp = new Float64Array(this.amplitudes.length);
    for (let i = 0; i < this.dim; i++) {
        const partner = i ^ step;
        const iR = this.amplitudes[i * 2], iI = this.amplitudes[i * 2 + 1];
        const pR = this.amplitudes[partner * 2], pI = this.amplitudes[partner * 2 + 1];
        if ((i & step) === 0) {
            newAmp[i * 2]     = cosH * iR - sinH * pR;
            newAmp[i * 2 + 1] = cosH * iI - sinH * pI;
        } else {
            newAmp[i * 2]     = sinH * pR + cosH * iR;
            newAmp[i * 2 + 1] = sinH * pI + cosH * iI;
        }
    }
    this.amplitudes = newAmp;
}
```
Następnie w VQC zmienić na: `qs.ry(q, ...)`, `qs.phaseShift(q, ...)`, `qs.ry(q, ...)`.

---

## 🟠 P1 — WYSOKIE (Błędy Logiczne / Wpływ na Trading)

---

### P1-1: VQC Training Labels — SELF-REFERENTIAL (pętla nieskończona)

**Plik:** `hybrid_quantum_pipeline.js`, linia 1722  
**Metoda:** `HybridQuantumClassicalPipeline.quantumBoost()`

```javascript
// Linia ~1722:
this._vqcTrainingBuffer.push({
    features,
    label: this._regimeToLabel(result.regimeClassification.regime) // ← OUTPUT JAKO LABEL!
});
```

**Problem:** `result.regimeClassification.regime` to **wynik klasyfikacji VQC** w bieżącym cyklu. Ale ten sam wynik jest zapisywany jako label treningowy. VQC trenuje się na **własnych predykcjach**, tworząc zamkniętą pętlę:
1. VQC klasyfikuje → `TRENDING_UP`
2. Ten wynik zapisany jako label: `{ features, label: 0 }` (TRENDING_UP = 0)
3. Przy treningu VQC uczy się: "te features = TRENDING_UP"
4. Ale to była **predykcja VQC**, nie prawdziwy reżim rynkowy

**Impact:** Training jest bezużyteczny. VQC uczy się reprodukować własne outputy zamiast poprawiać klasyfikację. Loss function konwerguje, ale predykcje nie mają związku z rzeczywistym reżimem rynkowym.

**Rekomendacja:** Dodać **ground truth** labelling na podstawie klasycznych wskaźników:
```javascript
// Zamiast VQC output, użyj klasycznego klasyfikatora reżimu:
const trueRegime = this._classifyRegimeClassical(returns, sigma);
this._vqcTrainingBuffer.push({ features, label: trueRegime });

_classifyRegimeClassical(returns, sigma) {
    const mu = returns.reduce((s,r) => s+r, 0) / returns.length;
    const smaRatio = mu / (sigma + 1e-8);
    const recentVol = Math.sqrt(returns.slice(-5).reduce((s,r) => s + (r-mu)**2, 0) / 5);
    if (recentVol > sigma * 2) return 3; // HIGH_VOLATILITY
    if (smaRatio > 0.5) return 0;        // TRENDING_UP
    if (smaRatio < -0.5) return 1;       // TRENDING_DOWN
    return 2;                              // RANGING
}
```

---

### P1-2: QPM SL Adjustments — NIGDY NIE DZIAŁAJĄ dla pozycji SHORT

**Plik:** `quantum_position_manager.js`, linia 1267  
**Metoda:** `QuantumPositionManager.evaluate()`

```javascript
// Linia 1267 — warunek który blokuje SHORT:
if (sltpResult.slChanged && sltpResult.newSL && sltpResult.newSL > pos.stopLoss) {
    result.adjustments.push({ type: 'SL_UPDATE', ... });
}
```

**Problem:** Dla pozycji LONG, zacieśnienie SL = przesunięcie W GÓRĘ (`newSL > currentSL` ✓). Ale dla pozycji SHORT, zacieśnienie SL = przesunięcie W DÓŁ (`newSL < currentSL`). Warunek `newSL > pos.stopLoss` **nigdy nie jest true** dla pozycji SHORT, bo `QuantumDynamicSLTP.calculate()` zapewnia, że `newSL <= currentSL` dla SHORT (linia 184: "SHORT SL constraint: can only move DOWN").

**Ten sam błąd** powtarza się w emergency SL tightening (linia 1328):
```javascript
const tightenedSL = Math.max(pos.stopLoss, currentPrice - multiplier * atr);
// ↑ Formuła tylko dla LONG. Dla SHORT powinno być:
// Math.min(pos.stopLoss, currentPrice + multiplier * atr)
```

**Impact:** 100% pozycji SHORT NIE otrzymuje kwantowych aktualizacji SL z QPM. Bot traci dynamiczną ochronę na pozycjach short.

**Rekomendacja:**
```javascript
// Linia 1267 — fix:
const isShort = pos.side === 'SHORT';
const slImproved = isShort
    ? (sltpResult.newSL < pos.stopLoss)  // SHORT: lower = tighter
    : (sltpResult.newSL > pos.stopLoss); // LONG: higher = tighter

if (sltpResult.slChanged && sltpResult.newSL && slImproved) {
    result.adjustments.push({ type: 'SL_UPDATE', ... });
}

// Linia 1328 — fix:
const tightenedSL = isShort
    ? Math.min(pos.stopLoss, currentPrice + multiplier * atr)
    : Math.max(pos.stopLoss, currentPrice - multiplier * atr);
const tightenedImproved = isShort
    ? (tightenedSL < pos.stopLoss)
    : (tightenedSL > pos.stopLoss);
if (tightenedImproved) { ... }
```

---

### P1-3: Quantum Importance Sampling — `phaseShift()` NIE zmienia prawdopodobieństw

**Pliki:**  
- `hybrid_quantum_pipeline.js` linie 113-130 (QMC)  
- `quantum_optimizer.js` linie 655-670 (quantumVaR)  

**Problem:** W obu miejscach, po `equalSuperposition()` (gdzie wszystkie amplitudy są rzeczywiste i równe), stosowane są bramki `phaseShift()` do "wzmocnienia" stanów ogonowych. Ale `phaseShift()` (Rz) to bramka fazowa — zmienia tylko **fazę** amplitudy, nie jej **moduł**:

$$Rz(\theta)|1\rangle = e^{i\theta}|1\rangle$$

Prawdopodobieństwo pomiarowe to $|α|^2 = Re^2 + Im^2$. Obrót fazowy nie zmienia $|α|^2$. W konsekwencji:

- **QMC "quantum paths"**: Pomiarowe próbkowane z rozkładu JEDNORODNEGO, nie z wzmocnionymi ogonami
- **quantumVaR**: VaR estimate oparty o losowe (jednorodne) próbkowanie zamiast importance sampling

Prawdziwe amplitude amplification (algorytm Grovera) wymaga:
1. **Oracle marking** (odwrócenie fazy target states) — ✓ zaimplementowane (phaseShift)
2. **Diffusion operator** (inwersja wokół średniej) — ✗ **BRAK**

Bez diffusion operatora, oznaczone stany NIE zyskują zwiększonego prawdopodobieństwa.

**Impact:** "Kwantowe" ścieżki w QMC są de facto ścieżkami z jednorodnego rozkładu po binach. Nie ma przewagi kwantowej over classical sampling. Wyniki QMC wciąż są sensowne (ścieżki klasyczne z fat tails dominują), ale marketing "quantum-amplified" jest fałszywy.

**Rekomendacja:** Albo zaimplementować pełny Grover (dodać diffusion operator), albo usunąć `QuantumState` z QMC/VaR i zastąpić uczciwym classical importance samplingiem z ważonym rozkładem (np. weighted bootstrap).

---

### P1-4: Quantum Stress Test — Dead Computation

**Plik:** `hybrid_quantum_pipeline.js`, linie 1107-1115  
**Metoda:** `QuantumRiskAnalyzer._quantumStressTest()`

```javascript
const nQubits = 4;
const qs = new QuantumState(nQubits);
qs.equalSuperposition();
for (let q = 0; q < nQubits; q++) {
    qs.phaseShift(q, Math.PI * 0.4);
}
// ← qs nigdy nie jest użyte w dalszej części metody!
```

**Problem:** QuantumState jest tworzony, faza zmieniana, a następnie **nigdy nie wykorzystany**. Cała dalsza logika (6 scenariuszy stress testowych, 500 MC ścieżek per scenariusz) jest czysto klasyczna. Alokacja 16-elementowego Float64Array jest zmarnowaną pamięcią i CPU.

**Impact:** Niski — niepotrzebne obliczenia, ale nie powoduje błędnych wyników.

**Rekomendacja:** Usunąć martwy kod kwantowy z `_quantumStressTest()`.

---

### P1-5: `quantumVaR()` — Multiple Measurements bez re-prepare

**Plik:** `quantum_optimizer.js`, linie 655-700  
**Metoda:** `QuantumPortfolioOptimizer.quantumVaR()`

Choć `measure()` w klasycznej symulacji nie niszczy stanu (bo oblicza prawdopodobieństwa i losuje, nie modyfikuje amplitud), to jak wykazano w P1-3, rozkład prawdopodobieństw po phase shift jest identyczny z rozkładem przed — jednorodny. Więc 5000 pomiarów to de facto 5000 losowań z rozkładu jednorodnego po 64 binach, co daje ~78 sampli na bin — mniej informacji niż proste obliczenie histogramu z danych historycznych.

**Impact:** quantumVaR nie jest dokładniejszy niż prosty VaR z percentylów historycznych. Generuje dodatkowy koszt CPU bez korzyści.

---

## 🟡 P2 — ŚREDNIE (Code Smells / Sub-optymalności)

---

### P2-1: Zduplikowane funkcje utility

**Pliki:** `quantum_optimizer.js` linie 35-57, `hybrid_quantum_pipeline.js` linie 46-57

`gaussianRandom()` i `quantumRandom()` zdefiniowane identycznie w obu plikach. Pipeline importuje z optimizer `QuantumState`, `SimulatedQuantumAnnealer`, etc., ale NIE importuje tych funkcji.

**Rekomendacja:** Pipeline powinien importować z `quantum_optimizer.js` lub obie powinny żyć w osobnym `quantum_utils.js`.

---

### P2-2: QFM Self-Kernel Overlap jest zawsze ~1.0

**Plik:** `hybrid_quantum_pipeline.js`, linie 876-878

```javascript
const phiX2 = this._createFeatureMapState(features);
const overlap = this._computeOverlap(phiX, phiX2);
quantumFeatures.push(overlap);
```

**Problem:** `phiX2` jest tworzony z tych samych features co `phiX`. Overlap `⟨φ(x)|φ(x)⟩` = 1.0 zawsze (identyczny stan z samym sobą). To dodaje stały feature ≈1.0, który nie niesie żadnej informacji.

**Rekomendacja:** Usunąć self-kernel overlap lub porównywać z historycznym snapshot (np. sprzed N cykli).

---

### P2-3: Grover Search nie jest Groverem

**Plik:** `quantum_optimizer.js`, linie 396-441  
**Metoda:** `QuantumWalkOptimizer.groverSearch()`

Pomimo nazwy "Grover-inspired search" i "amplitude amplification simulation", implementacja to klasyczna strategia ewolucyjna:
1. Random sampling + scoring
2. Weź top 20% kandydatów
3. Perturbuj je z blendem 70/30

Brak: stanu kwantowego, oracle, inwersji wokół średniej, iteracji Grovera.

**Impact:** Metoda działa sensownie jako heurystyczny optimizer, ale nazwa jest myląca.

---

### P2-4: QPM indentation anomaly

**Plik:** `quantum_position_manager.js`, linie ~196-228

Blok LONG SL (`if (atrMult >= 3.0)` itd.) ma wcięcie 8 spacji zamiast 12, niespójne z blokiem SHORT tuż nad nim. JavaScript ignoruje wcięcia więc logika jest poprawna, ale utrudnia czytanie i sugeruje potencjalne problemy copy-paste.

---

### P2-5: PATCHES.md ma unresolved git merge conflicts

**Plik:** `PATCHES.md`, linie 1-9

```
<<<<<<< HEAD
# 📋 PATCHES - Historia Zmian Bota Tradingowego
=======
#  REJESTR PATCHY  Turbo Bot
>>>>>>> ff0d38689ebb6aaf4a1dfb87290270ee39afa0d4
```

Znaczniki `<<<<<<< HEAD`, `=======`, `>>>>>>>` obecne na początku i potencjalnie końcu pliku. PM2 i bot działają (nie parsują PATCHES.md), ale wygląd jest nieprofesjonalny.

---

### P2-6: `QuantumWalkOptimizer.quantumWalk1D` — brak normalizacji po iteracjach

**Plik:** `quantum_optimizer.js`, linie 320-380

Po N krokach quantum walk, rozkład prawdopodobieństwa nie jest jawnie renormalizowany. Dla poprawnie zaimplementowanego unitarnego walk, suma prawdopodobieństw powinna być 1.0. W praktyce błędy zmiennoprzecinkowe mogą akumulować drift. `totalProb` jest obliczane, ale używane tylko do normalizacji `expectedMove`, nie do korekty `distribution`.

---

### P2-7: Brak re-exportu QuantumState z pipeline

**Plik:** `hybrid_quantum_pipeline.js`, eksporty (linia 2025)

Pipeline NIE eksportuje `QuantumState` mimo że go importuje i intensywnie używa. Oznacza to, że moduły zależne od pipeline muszą OSOBNO importować z `quantum_optimizer.js`. Nie jest to bug, ale narusza zasadę single-source imports.

---

## 📊 PODSUMOWANIE PRIORYTETÓW

| Priorytet | Ilość | Opis |
|-----------|-------|------|
| **P0** | 2 | quantum_gpu_sim.js kompletnie zepsuty; VQC brakuje bramki Ry |
| **P1** | 5 | VQC self-referential training; SHORT SL bug; phase shift ≠ amplitude amplification; dead quantum code; broken VaR |
| **P2** | 7 | Code duplication, misleading names, merge conflicts, formatting, etc. |

## 🎯 REKOMENDOWANA KOLEJNOŚĆ NAPRAW

1. **P0-2** → Napraw VQC: dodaj bramkę `Ry` do `QuantumState`, zmień VQC variational layers
2. **P1-1** → Napraw VQC training: dodaj classical ground truth labelling  
3. **P1-2** → Napraw QPM SHORT SL: direction-aware check w `evaluate()`
4. **P0-1** → Zdeprecjonuj `quantum_gpu_sim.js` (dodaj komentarz + zmień export)
5. **P1-3** → Dodaj diffusion operator do QMC/VaR albo zamień na classical importance sampling
6. **P1-4** → Usuń dead quantum code z stress test
7. **P2-*** → Cleanup batch: deduplikacja, merge conflicts, formatting

---

## 📝 NOTA KOŃCOWA

System kwantowy działa **stabilnie** w produkcji pomimo tych issues — głównie dlatego, że:
1. Prawdziwe decyzje tradingowe bazują na KLASYCZNYCH ścieżkach (7 strategii + Skynet Brain)
2. Quantum pipeline jest jedną z wielu warstw, nie jedyną
3. Graceful degradation: każdy komponent kwantowy jest w try/catch
4. QDV verification gate działa poprawnie (mimo że QMC feeding go jest sub-optymalny)

Naprawy P0 i P1 **znacząco poprawią** jakość klasyfikacji reżimów (VQC), zarządzania pozycjami SHORT, i rzetelność symulacji ryzyka.
