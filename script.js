let savedBets = [];
let probabilities = { win: {}, place: {}, show: {} };
let passwordAttempts = 0;
const correctPassword = "Ptool";

// ページ読み込み時の処理
document.addEventListener("DOMContentLoaded", () => {
    const manualLink = document.querySelector(".manual-link");
    if (manualLink) {
        manualLink.addEventListener("click", showManualModal);
        manualLink.addEventListener("touchstart", (e) => {
            e.preventDefault();
            showManualModal();
        });
    }
});

// マニュアルモーダルを表示
function showManualModal() {
    const modal = document.getElementById('manualModal');
    const overlay = document.getElementById('manualOverlay');
    if (modal && overlay) {
        modal.style.display = 'block';
        overlay.style.display = 'block';
    } else {
        console.error("manualModalまたはmanualOverlayが見つかりません");
    }
}

// マニュアルモーダルを閉じる
function closeManualModal() {
    const modal = document.getElementById('manualModal');
    const overlay = document.getElementById('manualOverlay');
    if (modal && overlay) {
        modal.style.display = 'none';
        overlay.style.display = 'none';
    }
}

// 出走数に基づいて1着・2着候補の選択肢を生成
function generateCarInputs() {
    const carCount = parseInt(document.getElementById("carCount").value);
    const firstSelect = document.getElementById("firstSelect");
    const secondSelect = document.getElementById("secondSelect");

    firstSelect.innerHTML = '<option value="">選択してください</option>';
    secondSelect.innerHTML = '<option value="">選択してください</option>';

    if (carCount) {
        for (let i = 1; i <= carCount; i++) {
            firstSelect.innerHTML += `<option value="${i}">${i}番</option>`;
            secondSelect.innerHTML += `<option value="${i}">${i}番</option>`;
        }
    }
    updateProbabilityInputs();
}

// 確率入力欄を更新
function updateProbabilityInputs() {
    const carCount = parseInt(document.getElementById("carCount").value);
    const first = document.getElementById("firstSelect").value;
    const second = document.getElementById("secondSelect").value;
    const probInputs = document.getElementById("probabilityInputs");

    if (!carCount || !first) {
        probInputs.innerHTML = "";
        document.getElementById("calcButton").disabled = true;
        return;
    }

    let html = '<table><thead><tr><th>枠番</th><th>1着率(%)</th><th>2着率(%)</th><th>3着率(%)</th></tr></thead><tbody>';
    for (let i = 1; i <= carCount; i++) {
        const isFirst = i === parseInt(first);
        const isSecond = i === parseInt(second);
        html += `
            <tr class="car-row-${i}">
                <td>${i}番</td>
                <td><input type="number" class="prob-input" data-type="win" data-car="${i}" min="0" max="100" value="0" ${isFirst ? '' : 'oninput="updateSums()"'} ${isFirst ? 'disabled' : ''}></td>
                <td><input type="number" class="prob-input" data-type="place" data-car="${i}" min="0" max="100" value="0" ${isFirst || isSecond ? 'disabled' : 'oninput="updateSums()"'}></td>
                <td><input type="number" class="prob-input" data-type="show" data-car="${i}" min="0" max="100" value="0" ${isFirst || isSecond ? 'disabled' : 'oninput="updateSums()"'}></td>
            </tr>`;
    }
    html += `<tr><td></td>
        <td><button class="fill-button" onclick="fillRemaining('win')">1着均等入力</button></td>
        <td><button class="fill-button" onclick="fillRemaining('place')">2着均等入力</button></td>
        <td><button class="fill-button" onclick="fillRemaining('show')">3着均等入力</button></td>
    </tr>`;
    html += '</tbody></table>';
    probInputs.innerHTML = html;
    document.getElementById("calcButton").disabled = false;
}

// 確率の合計を更新・チェック
function updateSums() {
    const types = ['win', 'place', 'show'];
    types.forEach(type => {
        const inputs = document.querySelectorAll(`.prob-input[data-type="${type}"]`);
        let sum = 0;
        inputs.forEach(input => {
            sum += parseInt(input.value) || 0;
        });
        if (sum > 100) {
            showErrorModal(`${type === 'win' ? '1着' : type === 'place' ? '2着' : '3着'}率の合計が100%を超えています`);
        }
    });
}

// 均等入力
function fillRemaining(type) {
    const inputs = document.querySelectorAll(`.prob-input[data-type="${type}"]:not(:disabled)`);
    let total = 0;
    inputs.forEach(input => {
        total += parseInt(input.value) || 0;
    });
    const remaining = 100 - total;
    const activeInputs = Array.from(inputs).filter(input => !input.disabled && parseInt(input.value) === 0);
    if (activeInputs.length === 0) return;

    const baseValue = Math.floor(remaining / activeInputs.length);
    let extra = remaining % activeInputs.length;

    activeInputs.forEach((input, index) => {
        input.value = baseValue + (index < extra ? 1 : 0);
    });
    updateSums();
}

// オッズ計算（簡易実装）
function calculateOdds() {
    const first = document.getElementById("firstSelect").value;
    const second = document.getElementById("secondSelect").value;
    const targetRecovery = parseInt(document.getElementById("targetRecovery").value);
    const carCount = parseInt(document.getElementById("carCount").value);
    const results = document.getElementById("results");

    probabilities = { win: {}, place: {}, show: {} };
    document.querySelectorAll('.prob-input').forEach(input => {
        const type = input.dataset.type;
        const car = input.dataset.car;
        probabilities[type][car] = parseInt(input.value) || 0;
    });

    let html = '<div class="results-container">';
    // 二連単
    html += '<div class="result-section"><h3>二連単</h3><table><tr><th>出目</th><th>確率(%)</th><th>必要オッズ</th><th>保存</th></tr>';
    for (let i = 1; i <= carCount; i++) {
        if (i !== parseInt(first)) {
            const prob = (probabilities.win[first] * probabilities.place[i]) / 100;
            const odds = (targetRecovery / prob).toFixed(1);
            html += `<tr><td>${first}-${i}</td><td>${prob.toFixed(1)}</td><td>${odds}</td><td><input type="checkbox" data-type="exacta" data-bet="${first}-${i}" data-prob="${prob}" data-odds="${odds}"></td></tr>`;
        }
    }
    html += '</table></div>';

    // 三連単
    if (second) {
        html += '<div class="result-section"><h3>三連単</h3><table><tr><th>出目</th><th>確率(%)</th><th>必要オッズ</th><th>保存</th></tr>';
        for (let i = 1; i <= carCount; i++) {
            if (i !== parseInt(first) && i !== parseInt(second)) {
                const prob = (probabilities.win[first] * probabilities.place[second] * probabilities.show[i]) / 10000;
                const odds = (targetRecovery / prob).toFixed(1);
                html += `<tr><td>${first}-${second}-${i}</td><td>${prob.toFixed(1)}</td><td>${odds}</td><td><input type="checkbox" data-type="trifecta" data-bet="${first}-${second}-${i}" data-prob="${prob}" data-odds="${odds}"></td></tr>`;
            }
        }
        html += '</table></div>';
    }
    html += '</div>';
    results.innerHTML = html;
    document.getElementById("saveButton").disabled = false;
}

// 買い目を保存
function saveSelectedBets() {
    const checkboxes = document.querySelectorAll('#results input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => {
        savedBets.push({
            type: checkbox.dataset.type,
            bet: checkbox.dataset.bet,
            prob: parseFloat(checkbox.dataset.prob),
            odds: parseFloat(checkbox.dataset.odds)
        });
    });
    updateSavedBetsDisplay();
    document.getElementById("results").innerHTML = "";
    document.getElementById("saveButton").disabled = true;
}

// 保存された買い目を表示
function updateSavedBetsDisplay() {
    const savedBetsDiv = document.getElementById("savedBets");
    let combinedProb = 0;
    savedBets.forEach(bet => combinedProb += bet.prob);
    const combinedOdds = (100 / combinedProb).toFixed(1);

    let html = `<p>買い目数: ${savedBets.length} 合成オッズ: ${combinedOdds}</p><table><tr><th>種類</th><th>出目</th><th>確率(%)</th><th>オッズ</th></tr>`;
    savedBets.forEach(bet => {
        html += `<tr><td>${getBetTypeName(bet.type)}</td><td>${bet.bet}</td><td>${bet.prob.toFixed(1)}</td><td>${bet.odds}</td></tr>`;
    });
    html += '</table>';
    savedBetsDiv.innerHTML = html;
}

// フォームリセット
function resetForm() {
    document.getElementById("carCount").value = "";
    document.getElementById("firstSelect").innerHTML = "";
    document.getElementById("secondSelect").innerHTML = "";
    document.getElementById("targetRecovery").value = "100";
    document.getElementById("probabilityInputs").innerHTML = "";
    document.getElementById("results").innerHTML = "";
    document.getElementById("savedBets").innerHTML = "";
    savedBets = [];
    document.getElementById("calcButton").disabled = true;
    document.getElementById("saveButton").disabled = true;
}

// ベットタイプ名を取得
function getBetTypeName(type) {
    return type === "exacta" ? "二連単" : "三連単";
}

// エラーモーダルを表示
function showErrorModal(message) {
    document.getElementById("errorMessage").textContent = message;
    document.getElementById("errorModal").style.display = "block";
}

// エラーモーダルを閉じる
function closeModal() {
    document.getElementById("errorModal").style.display = "none";
}
