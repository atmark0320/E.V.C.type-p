let savedBets = [];
let probabilities = { win: {}, place: {}, show: {} };
let passwordAttempts = 0;
const correctPassword = "Ptool"; // パスワード設定

// ページ読み込み時にパスワードモーダルを表示
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("passwordOverlay").style.display = "block";
    document.getElementById("passwordModal").style.display = "block";
    document.getElementById("passwordInput").focus();
});

// パスワードチェック
function checkPassword() {
    const inputPassword = document.getElementById("passwordInput").value;
    const attemptMessage = document.getElementById("attemptMessage");

    if (inputPassword === correctPassword) {
        // パスワードが正しい場合、メインコンテンツを表示
        document.getElementById("passwordOverlay").style.display = "none";
        document.getElementById("passwordModal").style.display = "none";
        document.getElementById("mainContent").style.display = "block";
    } else {
        passwordAttempts++;
        if (passwordAttempts >= 3) {
            // 3回間違えた場合、Googleにリダイレクト
            window.location.href = "https://www.google.com";
        } else {
            // 残り回数を表示
            attemptMessage.textContent = `パスワードが間違っています。残り${3 - passwordAttempts}回`;
            document.getElementById("passwordInput").value = "";
            document.getElementById("passwordInput").focus();
        }
    }
}

// Enterキーでパスワード送信
document.getElementById("passwordInput").addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
        checkPassword();
    }
});

// 以下は既存の関数（変更なし）
function generateCarInputs() {
    const count = parseInt(document.getElementById('carCount').value);
    const firstSelect = document.getElementById('firstSelect');
    const secondSelect = document.getElementById('secondSelect');
    firstSelect.innerHTML = '<option value="">選択してください</option>';
    secondSelect.innerHTML = '<option value="">選択してください</option>';
    document.getElementById('probabilityInputs').innerHTML = '';
    document.getElementById('results').innerHTML = '';
    
    if (!count) {
        document.getElementById('calcButton').disabled = true;
        document.getElementById('saveButton').disabled = true;
        return;
    }

    for (let i = 1; i <= count; i++) {
        const option1 = document.createElement('option');
        option1.value = i;
        option1.text = `${i}番`;
        firstSelect.appendChild(option1);
    }
    updateProbabilityInputs();
}

function updateProbabilityInputs() {
    const count = parseInt(document.getElementById('carCount').value);
    const firstSelect = document.getElementById('firstSelect');
    const secondSelect = document.getElementById('secondSelect');
    const firstSelected = parseInt(firstSelect.value) || null;
    const secondSelected = parseInt(secondSelect.value) || null;
    const probContainer = document.getElementById('probabilityInputs');

    secondSelect.innerHTML = '<option value="">選択してください</option>';
    for (let i = 1; i <= count; i++) {
        if (i !== firstSelected) {
            const option2 = document.createElement('option');
            option2.value = i;
            option2.text = `${i}番`;
            secondSelect.appendChild(option2);
        }
    }
    if (secondSelected && secondSelected !== firstSelected) {
        secondSelect.value = secondSelected;
    } else if (secondSelected === firstSelected) {
        secondSelect.value = '';
    }

    if (!count || !firstSelected) {
        probContainer.innerHTML = '<p class="message">1着候補を選択してください。</p>';
        document.getElementById('calcButton').disabled = true;
        document.getElementById('saveButton').disabled = true;
        return;
    }

    probContainer.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>枠番</th>
                    <th>1着率(%)<span class="sum-span" id="winSum">0</span></th>
                    <th>2着率(%)<span class="sum-span" id="placeSum">0</span></th>
                    <th>3着率(%)<span class="sum-span" id="showSum">0</span></th>
                </tr>
            </thead>
            <tbody>
                ${Array.from({ length: count }, (_, i) => i + 1).map(i => {
                    let firstInput = `<input type="number" id="win${i}" min="0" max="100" step="1" class="prob-input" value="${probabilities.win[i] || ''}" oninput="updateSums(); probabilities.win[${i}] = this.value">`;
                    let secondInput = `<input type="number" id="place${i}" min="0" max="100" step="1" class="prob-input" value="${probabilities.place[i] || ''}" oninput="updateSums(); probabilities.place[${i}] = this.value">`;
                    let thirdInput = `<input type="number" id="show${i}" min="0" max="100" step="1" class="prob-input" value="${probabilities.show[i] || ''}" oninput="updateSums(); probabilities.show[${i}] = this.value">`;

                    if (i === firstSelected) {
                        secondInput = `<input type="number" id="place${i}" min="0" max="100" step="1" disabled class="disabled prob-input">`;
                        thirdInput = `<input type="number" id="show${i}" min="0" max="100" step="1" disabled class="disabled prob-input">`;
                    } else if (i === secondSelected) {
                        thirdInput = `<input type="number" id="show${i}" min="0" max="100" step="1" disabled class="disabled prob-input">`;
                    }

                    return `
                        <tr class="car-row-${i}">
                            <td>${i}番</td>
                            <td>${firstInput}</td>
                            <td>${secondInput}</td>
                            <td>${thirdInput}</td>
                        </tr>
                    `;
                }).join('')}
                <tr>
                    <td class="fill-button-cell"></td>
                    <td class="fill-button-cell"><button class="fill-button" onclick="fillRemaining('win')">1着均等入力</button></td>
                    <td class="fill-button-cell"><button class="fill-button" onclick="fillRemaining('place')">2着均等入力</button></td>
                    <td class="fill-button-cell"><button class="fill-button" onclick="fillRemaining('show')">3着均等入力</button></td>
                </tr>
            </tbody>
        </table>
    `;
    document.getElementById('calcButton').disabled = false;
    document.getElementById('saveButton').disabled = true;
    updateSums();
}

function updateSums() {
    const count = parseInt(document.getElementById('carCount').value);
    if (!count) return;

    let winSum = 0, placeSum = 0, showSum = 0;
    const tolerance = 0.01;

    for (let i = 1; i <= count; i++) {
        const winInput = document.getElementById(`win${i}`);
        const placeInput = document.getElementById(`place${i}`);
        const showInput = document.getElementById(`show${i}`);

        const win = parseInt(winInput.value) || 0;
        const place = placeInput.disabled ? 0 : parseInt(placeInput.value) || 0;
        const show = showInput.disabled ? 0 : parseInt(showInput.value) || 0;

        winSum += win;
        placeSum += place;
        showSum += show;

        winInput.classList.toggle('error-input', winSum >= 100 + tolerance);
        placeInput.classList.toggle('error-input', placeSum >= 100 + tolerance && !placeInput.disabled);
        showInput.classList.toggle('error-input', showSum >= 100 + tolerance && !showInput.disabled);
    }
    document.getElementById('winSum').textContent = winSum;
    document.getElementById('placeSum').textContent = placeSum;
    document.getElementById('showSum').textContent = showSum;

    if (winSum >= 100 + tolerance || placeSum >= 100 + tolerance || showSum >= 100 + tolerance) {
        showErrorModal('合計確率が100%を超えています。調整してください。');
    } else {
        closeModal();
    }
}

function fillRemaining(type) {
    const count = parseInt(document.getElementById('carCount').value);
    if (!count) return;

    let sum = 0;
    let emptyInputs = [];
    for (let i = 1; i <= count; i++) {
        const input = document.getElementById(`${type}${i}`);
        if (input.disabled) continue;
        const value = parseInt(input.value) || 0;
        if (input.value === '') emptyInputs.push(i);
        else sum += value;
    }

    if (sum >= 100) return;

    const remaining = 100 - sum;
    const emptyCount = emptyInputs.length;
    if (emptyCount === 0) return;

    const baseValue = Math.floor(remaining / emptyCount);
    let totalAssigned = 0;

    emptyInputs.forEach((i, index) => {
        const input = document.getElementById(`${type}${i}`);
        let value = baseValue;
        if (index === emptyInputs.length - 1) {
            value = remaining - totalAssigned;
        }
        input.value = value;
        probabilities[type][i] = input.value;
        totalAssigned += value;
    });

    updateSums();
}

function calculateOdds() {
    const count = parseInt(document.getElementById('carCount').value);
    const targetRecovery = parseFloat(document.getElementById('targetRecovery').value) || 100;
    let cars = [];
    let winSum = 0, placeSum = 0, showSum = 0;
    let hasEmptyInput = false;

    for (let i = 1; i <= count; i++) {
        const winInput = document.getElementById(`win${i}`);
        const placeInput = document.getElementById(`place${i}`);
        const showInput = document.getElementById(`show${i}`);
        
        const win = winInput.value === '' ? null : parseInt(winInput.value);
        const place = placeInput.value === '' || placeInput.disabled ? null : parseInt(placeInput.value);
        const show = showInput.value === '' || showInput.disabled ? null : parseInt(showInput.value);

        if (win === null && !winInput.disabled) hasEmptyInput = true;
        if (place === null && !placeInput.disabled) hasEmptyInput = true;
        if (show === null && !showInput.disabled) hasEmptyInput = true;

        cars.push({ 
            id: i, 
            win: win !== null ? win / 100 : 0, 
            place: place !== null ? place / 100 : 0, 
            show: show !== null ? show / 100 : 0 
        });
        if (win !== null) winSum += win;
        if (place !== null) placeSum += place;
        if (show !== null) showSum += show;
    }

    const resultsDiv = document.getElementById('results');
    if (hasEmptyInput) {
        showErrorModal('未入力の項目があります。すべての有効な欄に入力してください。');
        document.getElementById('saveButton').disabled = true;
        return;
    }

    const tolerance = 0.01;
    if (Math.abs(winSum - 100) > tolerance || Math.abs(placeSum - 100) > tolerance || Math.abs(showSum - 100) > tolerance) {
        showErrorModal(`確率の合計が100%ではありません。\n1着率合計: ${winSum}%, 2着率合計: ${placeSum}%, 3着率合計: ${showSum}%`);
        document.getElementById('saveButton').disabled = true;
        return;
    }

    const firstSelected = parseInt(document.getElementById('firstSelect').value);
    const secondSelected = document.getElementById('secondSelect').value ? parseInt(document.getElementById('secondSelect').value) : null;
    const firstCar = cars[firstSelected - 1];
    const secondCar = secondSelected ? cars[secondSelected - 1] : null;

    let results = { exacta: [], trifecta: [] };

    if (firstSelected) {
        cars.forEach(s => {
            if (s.id !== firstSelected) {
                const prob = firstCar.win * s.place;
                const baseOdds = (1 / prob);
                const odds = prob > 0 ? (targetRecovery === 100 ? Number(baseOdds.toFixed(1)) : Number((baseOdds * (targetRecovery / 100)).toFixed(1))) : 1000;
                results.exacta.push({ pattern: `${firstCar.id}-${s.id}`, prob, odds });
            }
        });
    }

    if (firstSelected && secondSelected && firstSelected !== secondSelected) {
        cars.forEach(t => {
            if (t.id !== firstSelected && t.id !== secondSelected) {
                const prob = firstCar.win * secondCar.place * t.show;
                const baseOdds = (1 / prob);
                const odds = prob > 0 ? (targetRecovery === 100 ? Number(baseOdds.toFixed(1)) : Number((baseOdds * (targetRecovery / 100)).toFixed(1))) : 1000;
                results.trifecta.push({ pattern: `${firstCar.id}-${secondCar.id}-${t.id}`, prob, odds });
            }
        });
    }

    resultsDiv.innerHTML = `
        <h2>計算結果 (目標回収率: ${targetRecovery}%)</h2>
        <div class="results-container">
            ${Object.entries(results).map(([type, patterns]) => `
                <div class="result-section">
                    <h3>${getBetTypeName(type)}</h3>
                    ${patterns.length > 0 ? `
                        <div style="overflow-x: auto;">
                            <table>
                                <tr><th>選択</th><th>出目</th><th>成立確率</th><th>必要オッズ</th></tr>
                                ${patterns.map(p => `
                                    <tr>
                                        <td><input type="checkbox" class="bet-checkbox" data-type="${type}" data-pattern="${p.pattern}" data-prob="${p.prob}" data-odds="${p.odds}"></td>
                                        <td>${p.pattern}</td>
                                        <td>${(p.prob * 100).toFixed(1)}%</td>
                                        <td>${p.odds}倍</td>
                                    </tr>
                                `).join('')}
                            </table>
                        </div>
                    ` : '<p>該当なし</p>'}
                </div>
            `).join('')}
        </div>
    `;
    document.getElementById('saveButton').disabled = false;
}

function saveSelectedBets() {
    const checkboxes = document.querySelectorAll('.bet-checkbox:checked');
    if (checkboxes.length === 0) {
        showErrorModal('保存する買い目を選択してください。');
        return;
    }

    let oddsSum = 0;
    const newBets = [];
    checkboxes.forEach(checkbox => {
        const bet = {
            type: checkbox.dataset.type,
            pattern: checkbox.dataset.pattern,
            prob: parseFloat(checkbox.dataset.prob),
            odds: parseFloat(checkbox.dataset.odds)
        };
        newBets.push(bet);
        oddsSum += 1 / bet.odds;
    });

    savedBets = savedBets.concat(newBets);

    let totalOddsSum = 0;
    savedBets.forEach(bet => {
        totalOddsSum += 1 / bet.odds;
    });
    const combinedOdds = totalOddsSum > 0 ? Math.round((1 / totalOddsSum) * 100) / 100 : 1000;

    updateSavedBetsDisplay(combinedOdds);
    document.getElementById('results').innerHTML = '';
    document.getElementById('saveButton').disabled = true;

    document.getElementById('carCount').disabled = true;
    document.getElementById('targetRecovery').disabled = true;
}

function updateSavedBetsDisplay(combinedOdds) {
    const savedBetsDiv = document.getElementById('savedBets');
    if (savedBets.length === 0) {
        savedBetsDiv.innerHTML = '<p>保存された買い目はまだありません。</p>';
        return;
    }

    savedBetsDiv.innerHTML = `
        <p>保存された買い目数: ${savedBets.length}</p>
        <p>合成オッズ: ${combinedOdds}倍</p>
        <table>
            <tr><th>種類</th><th>出目</th><th>成立確率</th><th>必要オッズ</th></tr>
            ${savedBets.map(bet => `
                <tr>
                    <td>${getBetTypeName(bet.type)}</td>
                    <td>${bet.pattern}</td>
                    <td>${(bet.prob * 100).toFixed(1)}%</td>
                    <td>${bet.odds}倍</td>
                </tr>
            `).join('')}
        </table>
    `;
}

function resetForm() {
    document.getElementById('carCount').value = '';
    document.getElementById('carCount').disabled = false;
    const firstSelect = document.getElementById('firstSelect');
    const secondSelect = document.getElementById('secondSelect');
    firstSelect.innerHTML = '<option value="">選択してください</option>';
    secondSelect.innerHTML = '<option value="">選択してください</option>';
    document.getElementById('targetRecovery').value = '100';
    document.getElementById('targetRecovery').disabled = false;
    document.getElementById('probabilityInputs').innerHTML = '';
    document.getElementById('results').innerHTML = '';
    document.getElementById('calcButton').disabled = true;
    document.getElementById('saveButton').disabled = true;
    savedBets = [];
    probabilities = { win: {}, place: {}, show: {} };
    updateSavedBetsDisplay();
    closeModal();
}

function getBetTypeName(type) {
    const names = { exacta: '二連単', trifecta: '三連単' };
    return names[type];
}

function showErrorModal(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('errorModal').style.display = 'none';
}

function showManualModal() {
    document.getElementById('manualOverlay').style.display = 'block';
    document.getElementById('manualModal').style.display = 'block';
}

function closeManualModal() {
    document.getElementById('manualOverlay').style.display = 'none';
    document.getElementById('manualModal').style.display = 'none';
}