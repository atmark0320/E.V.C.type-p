let savedBets = [];
let probabilities = { win: {}, place: {}, show: {} };
let passwordAttempts = 0;
const correctPassword = "Ptool";

// ページ読み込み時の処理
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("passwordModal")) {
        document.getElementById("passwordOverlay").style.display = "block";
        document.getElementById("passwordModal").style.display = "block";
        document.getElementById("passwordInput").focus();
    }
});

// パスワードチェック
function checkPassword() {
    const inputPassword = document.getElementById("passwordInput").value;
    const attemptMessage = document.getElementById("attemptMessage");

    if (inputPassword === correctPassword) {
        window.location.href = "main.html";
    } else {
        passwordAttempts++;
        if (passwordAttempts >= 3) {
            window.location.href = "https://www.google.com";
        } else {
            attemptMessage.textContent = `パスワードが間違っています。残り${3 - passwordAttempts}回`;
            document.getElementById("passwordInput").value = "";
            document.getElementById("passwordInput").focus();
        }
    }
}

// Enterキーでパスワード送信
if (document.getElementById("passwordInput")) {
    document.getElementById("passwordInput").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            checkPassword();
        }
    });
}

// 出走数選択時の処理
function generateCarInputs() {
    const count = parseInt(document.getElementById('carCount').value);
    const firstSelect = document.getElementById('firstSelect');
    const secondSelect = document.getElementById('secondSelect');

    console.log("出走数:", count); // デバッグ用

    // 選択肢をクリア
    firstSelect.innerHTML = '<option value="">選択してください</option>';
    secondSelect.innerHTML = '<option value="">選択してください</option>';
    document.getElementById('probabilityInputs').innerHTML = '';
    document.getElementById('results').innerHTML = '';
    savedBets = [];
    updateSavedBetsDisplay();

    if (!count) {
        document.getElementById('calcButton').disabled = true;
        document.getElementById('saveButton').disabled = true;
        return;
    }

    // 1着候補と2着候補の選択肢を生成
    for (let i = 1; i <= count; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.text = `${i}番`;
        firstSelect.appendChild(option.cloneNode(true));
        secondSelect.appendChild(option.cloneNode(true));
    }

    console.log("1着候補選択肢:", firstSelect.innerHTML); // デバッグ用
    console.log("2着候補選択肢:", secondSelect.innerHTML); // デバッグ用

    firstSelect.disabled = false; // 明示的に有効化
    secondSelect.disabled = false; // 明示的に有効化

    updateProbabilityInputs();
}

// 確率入力エリアの更新
function updateProbabilityInputs() {
    const carCount = parseInt(document.getElementById('carCount').value);
    const first = document.getElementById('firstSelect').value;
    const second = document.getElementById('secondSelect').value;
    const probabilityInputs = document.getElementById('probabilityInputs');

    console.log("1着:", first, "2着:", second); // デバッグ用

    if (!carCount || !first) {
        probabilityInputs.innerHTML = '';
        document.getElementById('calcButton').disabled = true;
        return;
    }

    probabilities = { win: {}, place: {}, show: {} };
    let html = '<table><thead><tr><th>枠番</th><th>1着率(%)</th><th>2着率(%)</th><th>3着率(%)</th></tr></thead><tbody>';
    for (let i = 1; i <= carCount; i++) {
        const isFirst = i == first;
        const isSecond = i == second;
        html += `
            <tr>
                <td>${i}番</td>
                <td><input type="number" min="0" max="100" step="1" class="prob-input" data-type="win" data-car="${i}" ${isFirst ? '' : 'oninput="updateSums()"'} value="${isFirst ? '100' : '0'}"></td>
                <td><input type="number" min="0" max="100" step="1" class="prob-input" data-type="place" data-car="${i}" ${isFirst || isSecond ? 'disabled' : 'oninput="updateSums()"'} value="0"></td>
                <td><input type="number" min="0" max="100" step="1" class="prob-input" data-type="show" data-car="${i}" ${isFirst || !second || isSecond ? 'disabled' : 'oninput="updateSums()"'} value="0"></td>
            </tr>`;
    }
    html += '</tbody></table>';
    html += '<button onclick="fillRemaining(\'win\')">1着均等入力</button>';
    html += '<button onclick="fillRemaining(\'place\')">2着均等入力</button>';
    html += '<button onclick="fillRemaining(\'show\')">3着均等入力</button>';
    probabilityInputs.innerHTML = html;

    document.getElementById('calcButton').disabled = false;
    updateSums();
}

// 確率の合計を更新
function updateSums() {
    const inputs = document.querySelectorAll('.prob-input');
    let sums = { win: 0, place: 0, show: 0 };
    probabilities = { win: {}, place: {}, show: {} };

    inputs.forEach(input => {
        if (!input.disabled) {
            const value = parseInt(input.value) || 0;
            const type = input.dataset.type;
            const car = input.dataset.car;
            probabilities[type][car] = value;
            sums[type] += value;
        }
    });

    if (sums.win !== 100 || (sums.place > 0 && sums.place !== 100) || (sums.show > 0 && sums.show !== 100)) {
        showErrorModal(`確率の合計が100%ではありません: 1着=${sums.win}%, 2着=${sums.place}%, 3着=${sums.show}%`);
        document.getElementById('calcButton').disabled = true;
    } else {
        document.getElementById('calcButton').disabled = false;
    }
}

// 残りの確率を均等に割り振り
function fillRemaining(type) {
    const inputs = document.querySelectorAll(`.prob-input[data-type="${type}"]:not(:disabled)`);
    let total = 0;
    let emptyCount = 0;

    inputs.forEach(input => {
        const value = parseInt(input.value) || 0;
        if (value === 0) emptyCount++;
        total += value;
    });

    const remaining = 100 - total;
    if (remaining <= 0 || emptyCount === 0) return;

    const perInput = Math.floor(remaining / emptyCount);
    const extra = remaining % emptyCount;

    inputs.forEach((input, index) => {
        if (!parseInt(input.value)) {
            input.value = perInput + (index < extra ? 1 : 0);
        }
    });
    updateSums();
}

// オッズ計算
function calculateOdds() {
    const first = document.getElementById('firstSelect').value;
    const second = document.getElementById('secondSelect').value;
    const targetRecovery = parseInt(document.getElementById('targetRecovery').value);
    const carCount = parseInt(document.getElementById('carCount').value);
    let resultsHtml = '<h2>計算結果</h2><table><thead><tr><th>種類</th><th>出目</th><th>成立確率(%)</th><th>必要オッズ</th><th>選択</th></tr></thead><tbody>';

    for (let i = 1; i <= carCount; i++) {
        if (i != first) {
            const prob = (probabilities.win[first] * probabilities.place[i]) / 10000;
            const odds = (targetRecovery / prob / 100).toFixed(1);
            resultsHtml += `
                <tr>
                    <td>二連単</td>
                    <td>${first}-${i}</td>
                    <td>${(prob * 100).toFixed(1)}</td>
                    <td>${odds}</td>
                    <td><input type="checkbox" class="bet-checkbox" data-type="exacta" data-bet="${first}-${i}" data-prob="${prob}" data-odds="${odds}"></td>
                </tr>`;
        }
    }

    if (second) {
        for (let i = 1; i <= carCount; i++) {
            if (i != first && i != second) {
                const prob = (probabilities.win[first] * probabilities.place[second] * probabilities.show[i]) / 1000000;
                const odds = (targetRecovery / prob / 100).toFixed(1);
                resultsHtml += `
                    <tr>
                        <td>三連単</td>
                        <td>${first}-${second}-${i}</td>
                        <td>${(prob * 100).toFixed(1)}</td>
                        <td>${odds}</td>
                        <td><input type="checkbox" class="bet-checkbox" data-type="trifecta" data-bet="${first}-${second}-${i}" data-prob="${prob}" data-odds="${odds}"></td>
                    </tr>`;
            }
        }
    }

    resultsHtml += '</tbody></table>';
    document.getElementById('results').innerHTML = resultsHtml;
    document.getElementById('saveButton').disabled = false;
}

// 選択した買い目を保存
function saveSelectedBets() {
    const checkboxes = document.querySelectorAll('.bet-checkbox:checked');
    checkboxes.forEach(checkbox => {
        savedBets.push({
            type: checkbox.dataset.type,
            bet: checkbox.dataset.bet,
            prob: parseFloat(checkbox.dataset.prob),
            odds: parseFloat(checkbox.dataset.odds)
        });
    });

    if (savedBets.length > 0) {
        updateSavedBetsDisplay();
        document.getElementById('results').innerHTML = '';
        document.getElementById('saveButton').disabled = true;
    }
}

// 保存された買い目を表示
function updateSavedBetsDisplay() {
    const savedBetsDiv = document.getElementById('savedBets');
    if (savedBets.length === 0) {
        savedBetsDiv.innerHTML = '<p>保存された買い目はありません。</p>';
        return;
    }

    let totalProb = 0;
    savedBets.forEach(bet => totalProb += bet.prob);
    const combinedOdds = (1 / totalProb).toFixed(1);

    let html = `<p>買い目数: ${savedBets.length} 合成オッズ: ${combinedOdds}</p><ul>`;
    savedBets.forEach(bet => {
        html += `<li>${getBetTypeName(bet.type)}: ${bet.bet} - 確率: ${(bet.prob * 100).toFixed(1)}%, オッズ: ${bet.odds}</li>`;
    });
    html += '</ul>';
    savedBetsDiv.innerHTML = html;
}

// 賭けの種類名を取得
function getBetTypeName(type) {
    return type === 'exacta' ? '二連単' : '三連単';
}

// フォームのリセット
function resetForm() {
    document.getElementById('carCount').value = '';
    document.getElementById('firstSelect').innerHTML = '<option value="">選択してください</option>';
    document.getElementById('secondSelect').innerHTML = '<option value="">選択してください</option>';
    document.getElementById('targetRecovery').value = '100';
    document.getElementById('probabilityInputs').innerHTML = '';
    document.getElementById('results').innerHTML = '';
    document.getElementById('calcButton').disabled = true;
    document.getElementById('saveButton').disabled = true;
    savedBets = [];
    updateSavedBetsDisplay();
}

// エラーモーダルの表示
function showErrorModal(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').style.display = 'block';
}

// エラーモーダルの閉じる
function closeModal() {
    document.getElementById('errorModal').style.display = 'none';
}

// マニュアルモーダルの表示
function showManualModal() {
    document.getElementById('manualOverlay').style.display = 'block';
    document.getElementById('manualModal').style.display = 'block';
}

// マニュアルモーダルの閉じる
function closeManualModal() {
    document.getElementById('manualOverlay').style.display = 'none';
    document.getElementById('manualModal').style.display = 'none';
}
