// このスクリプトは、競輪のオッズ計算ツールを制御します。
// 買い目データはブラウザのメモリに一時的に保存され、ブラウザを閉じたりページを更新したりすると失われます。

let savedBets = []; // 保存された買い目を保持する配列
let probabilities = { win: {}, place: {}, show: {} }; // 各枠番の確率を保持

// DOMContentLoaded イベントリスナー: HTMLが完全に読み込まれてから実行
document.addEventListener('DOMContentLoaded', async () => {
    // 各セレクト要素への参照を取得
    const carCountSelect = document.getElementById('carCount');
    const firstSelect = document.getElementById('firstSelect');
    const secondSelect = document.getElementById('secondSelect');

    // 初期状態で1着候補と2着候補のドロップダウンを無効化
    firstSelect.disabled = true;
    secondSelect.disabled = true;
    console.log('DOMContentLoaded: 1着候補と2着候補のドロップダウンを無効化しました。');

    // イベントリスナーを設定
    carCountSelect.addEventListener('change', generateCarInputs);
    firstSelect.addEventListener('change', updateProbabilityInputs);
    secondSelect.addEventListener('change', updateProbabilityInputs);

    // savedBetsは初期状態の空配列（localStorageからのロードは行いません）
    updateSavedBetsDisplay();

    // 買い目がある場合は出走数と目標回収率を無効化
    if (savedBets.length > 0) {
        document.getElementById('carCount').disabled = true;
        document.getElementById('targetRecovery').disabled = true;
    } else {
        document.getElementById('carCount').disabled = false;
        document.getElementById('targetRecovery').disabled = false;
    }
});

/**
 * localStorageから保存された買い目をロードします。
 * localStorageを使用しないため、この関数はsavedBetsを初期化するのみです。
 */
function loadSavedBetsFromLocalStorage() {
    // localStorageからのロードは行いません。
    savedBets = [];
    console.log("localStorageを使用しないため、買い目のロードは行われません。");
}

/**
 * 出走数に基づいて入力フィールドを生成します。
 * 1着候補と2着候補のドロップダウン、および確率入力テーブルを更新します。
 */
function generateCarInputs() {
    const count = parseInt(document.getElementById('carCount').value);
    const firstSelect = document.getElementById('firstSelect');
    const secondSelect = document.getElementById('secondSelect');
    
    // 既存の選択肢と結果表示をクリア
    firstSelect.innerHTML = '<option value="">選択してください</option>';
    secondSelect.innerHTML = '<option value="">選択してください</option>';
    document.getElementById('probabilityInputs').innerHTML = '';
    document.getElementById('results').innerHTML = '';
    
    if (!count) { // 出走数が選択されていない場合
        document.getElementById('calcButton').disabled = true;
        document.getElementById('saveButton').disabled = true;
        // ドロップダウンを無効化
        firstSelect.disabled = true;
        secondSelect.disabled = true;
        console.log('generateCarInputs: 出走数が選択されていません。ドロップダウンを無効化しました。');
        return;
    }

    // 1着候補の選択肢を生成し、有効化
    for (let i = 1; i <= count; i++) {
        const option1 = document.createElement('option');
        option1.value = i;
        option1.text = `${i}番`;
        firstSelect.appendChild(option1);
    }
    // 出走数が選択されたら1着候補を有効化
    firstSelect.disabled = false;
    console.log('generateCarInputs: 出走数が選択されました。1着候補を有効化しました。');
    updateProbabilityInputs(); // 確率入力フィールドを更新
}

/**
 * 1着候補と2着候補の選択に基づいて確率入力フィールドを更新します。
 */
function updateProbabilityInputs() {
    const count = parseInt(document.getElementById('carCount').value);
    const firstSelect = document.getElementById('firstSelect');
    const secondSelect = document.getElementById('secondSelect');
    const firstSelected = parseInt(firstSelect.value) || null; // 1着候補の値を取得
    const secondSelected = parseInt(secondSelect.value) || null; // 2着候補の値を取得
    const probContainer = document.getElementById('probabilityInputs');

    // 2着候補の選択肢をクリア
    secondSelect.innerHTML = '<option value="">選択してください</option>';

    if (firstSelected) { // 1着候補が選択されている場合のみ2着候補を有効化
        for (let i = 1; i <= count; i++) {
            if (i !== firstSelected) { // 1着候補と同じ枠番は選択不可
                const option2 = document.createElement('option');
                option2.value = i;
                option2.text = `${i}番`;
                secondSelect.appendChild(option2);
            }
        }
        // 1着候補が選択されたら2着候補を有効化
        secondSelect.disabled = false;
        console.log('updateProbabilityInputs: 1着候補が選択されました。2着候補を有効化しました。');
    } else {
        // 1着候補が選択されていない場合は2着候補を無効化
        secondSelect.disabled = true;
        console.log('updateProbabilityInputs: 1着候補が選択されていません。2着候補を無効化しました。');
    }

    // 以前に選択されていた2着候補を保持（もしあれば）
    if (secondSelected && secondSelected !== firstSelected) {
        secondSelect.value = secondSelected;
    } else if (secondSelected === firstSelected) {
        secondSelect.value = ''; // 1着候補と同じ場合はクリア
    }

    // 出走数または1着候補が選択されていない場合
    if (!count || !firstSelected) {
        probContainer.innerHTML = '<p class="message">1着候補を選択してください。</p>';
        document.getElementById('calcButton').disabled = true;
        document.getElementById('saveButton').disabled = true;
        return;
    }

    // 確率入力テーブルを生成
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

                    // 1着候補の枠番は2着率・3着率を無効化
                    if (i === firstSelected) {
                        secondInput = `<input type="number" id="place${i}" min="0" max="100" step="1" disabled class="disabled prob-input">`;
                        thirdInput = `<input type="number" id="show${i}" min="0" max="100" step="1" disabled class="disabled prob-input">`;
                    } else if (i === secondSelected) { // 2着候補の枠番は3着率を無効化
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
    document.getElementById('calcButton').disabled = false; // 計算ボタンを有効化
    document.getElementById('saveButton').disabled = true; // 保存ボタンを無効化
    updateSums(); // 合計値を更新
}

/**
 * 各確率入力列の合計値を更新し、100%を超えた場合にエラーを表示します。
 */
function updateSums() {
    const count = parseInt(document.getElementById('carCount').value);
    if (!count) return;

    let winSum = 0, placeSum = 0, showSum = 0;
    const tolerance = 0.01; // 浮動小数点誤差の許容範囲

    for (let i = 1; i <= count; i++) {
        const winInput = document.getElementById(`win${i}`);
        const placeInput = document.getElementById(`place${i}`);
        const showInput = document.getElementById(`show${i}`);

        // 入力値を取得し、無効な場合は0として扱う
        const win = parseInt(winInput.value) || 0;
        const place = placeInput.disabled ? 0 : parseInt(placeInput.value) || 0;
        const show = showInput.disabled ? 0 : parseInt(showInput.value) || 0;

        winSum += win;
        placeSum += place;
        showSum += show;

        // 合計が100%を超えた場合、エラー表示
        winInput.classList.toggle('error-input', winSum >= 100 + tolerance);
        placeInput.classList.toggle('error-input', placeSum >= 100 + tolerance && !placeInput.disabled);
        showInput.classList.toggle('error-input', showSum >= 100 + tolerance && !showInput.disabled);
    }
    document.getElementById('winSum').textContent = winSum;
    document.getElementById('placeSum').textContent = placeSum;
    document.getElementById('showSum').textContent = showSum;

    // 合計が100%を超えた場合、エラーモーダルを表示
    if (winSum >= 100 + tolerance || placeSum >= 100 + tolerance || showSum >= 100 + tolerance) {
        showMessageModal('合計確率が100%を超えています。調整してください。', true);
    } else {
        closeModal(); // エラーが解消されたらモーダルを閉じる
    }
}

/**
 * 未入力の確率フィールドに残りの確率を均等に割り振ります。
 * @param {string} type - 'win', 'place', 'show' のいずれか
 */
function fillRemaining(type) {
    const count = parseInt(document.getElementById('carCount').value);
    if (!count) return;

    let sum = 0;
    let emptyInputs = [];
    for (let i = 1; i <= count; i++) {
        const input = document.getElementById(`${type}${i}`);
        if (input.disabled) continue; // 無効な入力はスキップ
        const value = parseInt(input.value) || 0;
        if (input.value === '') emptyInputs.push(i); // 空の入力フィールドを記録
        else sum += value;
    }

    if (sum >= 100) return; // 合計が100%以上の場合は何もしない

    const remaining = 100 - sum; // 残りの確率
    const emptyCount = emptyInputs.length; // 空の入力フィールドの数
    if (emptyCount === 0) return; // 空の入力フィールドがない場合は何もしない

    const baseValue = Math.floor(remaining / emptyCount); // 基本の割り振り値
    let totalAssigned = 0;

    // 残りの確率を均等に割り振る
    emptyInputs.forEach((i, index) => {
        const input = document.getElementById(`${type}${i}`);
        let value = baseValue;
        // 最後の要素には残りをすべて割り振る（端数処理）
        if (index === emptyInputs.length - 1) {
            value = remaining - totalAssigned;
        }
        input.value = value;
        probabilities[type][i] = input.value; // 確率を保存
        totalAssigned += value;
    });

    updateSums(); // 合計値を更新
}

/**
 * 入力された確率と目標回収率に基づいてオッズを計算し、結果を表示します。
 */
function calculateOdds() {
    const count = parseInt(document.getElementById('carCount').value);
    const targetRecovery = parseFloat(document.getElementById('targetRecovery').value) || 100;
    let cars = [];
    let winSum = 0, placeSum = 0, showSum = 0;
    let hasEmptyInput = false;

    // 各車の確率データを収集
    for (let i = 1; i <= count; i++) {
        const winInput = document.getElementById(`win${i}`);
        const placeInput = document.getElementById(`place${i}`);
        const showInput = document.getElementById(`show${i}`);
        
        const win = winInput.value === '' ? null : parseInt(winInput.value);
        const place = placeInput.value === '' || placeInput.disabled ? null : parseInt(placeInput.value);
        const show = showInput.value === '' || showInput.disabled ? null : parseInt(showInput.value);

        // 未入力の有効なフィールドがあるかチェック
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
    // 未入力項目がある場合、エラーモーダルを表示
    if (hasEmptyInput) {
        showMessageModal('未入力の項目があります。すべての有効な欄に入力してください。', true);
        document.getElementById('saveButton').disabled = true;
        return;
    }

    const tolerance = 0.01;
    // 確率の合計が100%でない場合、エラーモーダルを表示
    if (Math.abs(winSum - 100) > tolerance || Math.abs(placeSum - 100) > tolerance || Math.abs(showSum - 100) > tolerance) {
        showMessageModal(`確率の合計が100%ではありません。\n1着率合計: ${winSum}%, 2着率合計: ${placeSum}%, 3着率合計: ${showSum}%`, true);
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
                // 目標回収率に基づいてオッズを調整
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
                // 目標回収率に基づいてオッズを調整
                const odds = prob > 0 ? (targetRecovery === 100 ? Number(baseOdds.toFixed(1)) : Number((baseOdds * (targetRecovery / 100)).toFixed(1))) : 1000;
                results.trifecta.push({ pattern: `${firstCar.id}-${secondCar.id}-${t.id}`, prob, odds });
            }
        });
    }

    // 結果を表示
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
    document.getElementById('saveButton').disabled = false; // 保存ボタンを有効化
}

/**
 * 選択された買い目を一時的に保存します。
 * このデータはページを更新したりブラウザを閉じたりすると失われます。
 */
async function saveSelectedBets() {
    const checkboxes = document.querySelectorAll('.bet-checkbox:checked');
    if (checkboxes.length === 0) {
        showMessageModal('保存する買い目を選択してください。', true);
        return;
    }
    
    // 名前を自動生成 (例: "買い目セット") - タイムスタンプを削除
    const name = `買い目セット`; 

    const newBets = [];
    checkboxes.forEach(checkbox => {
        const bet = {
            type: checkbox.dataset.type,
            pattern: checkbox.dataset.pattern,
            prob: parseFloat(checkbox.dataset.prob),
            odds: parseFloat(checkbox.dataset.odds)
        };
        newBets.push(bet);
    });

    savedBets.push({
        id: Date.now().toString(), // 一意なIDを生成
        name: name, // 自動生成された名前を使用
        bets: newBets,
        timestamp: new Date().toISOString() // ISO形式で日付を保存
    });

    updateSavedBetsDisplay(); // 表示を更新
    // showMessageModal("買い目が保存されました。（このデータはページを閉じると消えます）", false); // ポップアップを削除

    document.getElementById('results').innerHTML = '';
    document.getElementById('saveButton').disabled = true;

    // 買い目を保存したら出走数と目標回収率を無効化
    document.getElementById('carCount').disabled = true;
    document.getElementById('targetRecovery').disabled = true;
}

/**
 * 保存された買い目を表示エリアにレンダリングします。
 */
function updateSavedBetsDisplay() {
    const savedBetsDiv = document.getElementById('savedBets');
    const deleteIndividualBetsButton = document.getElementById('deleteIndividualBetsButton');
    const exportTextButton = document.getElementById('exportTextButton'); // 追加

    if (savedBets.length === 0) {
        savedBetsDiv.innerHTML = '<p>保存された買い目はまだありません。</p>';
        deleteIndividualBetsButton.style.display = 'none'; // ボタンを非表示にする
        exportTextButton.style.display = 'none'; // ボタンを非表示にする
        return;
    }

    let displayHtml = '';
    
    // 全体の合成オッズを計算
    let overallTotalOddsSum = 0;
    let overallTotalBetsCount = 0;
    savedBets.forEach(savedSet => {
        savedSet.bets.forEach(bet => {
            overallTotalOddsSum += 1 / bet.odds;
            overallTotalBetsCount++;
        });
    });
    const overallCombinedOdds = overallTotalOddsSum > 0 ? Math.round((1 / overallTotalOddsSum) * 100) / 100 : 1000;

    // 全体の合成オッズを表示
    if (savedBets.length > 0) { // 少なくとも1つのセットがあれば表示
        displayHtml += `
            <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; background-color: #e0f7fa; border-radius: 5px;">
                <strong>全体の点数: ${overallTotalBetsCount}点, 全体の合成オッズ: ${overallCombinedOdds}倍</strong>
            </div>
        `;
    }

    savedBets.forEach((savedSet, setIndex) => {
        let totalOddsSum = 0;
        savedSet.bets.forEach(bet => {
            totalOddsSum += 1 / bet.odds;
        });
        const combinedOdds = totalOddsSum > 0 ? Math.round((1 / totalOddsSum) * 100) / 100 : 1000;

        // 買い目セットのヘッダーには削除ボタンをつけない
        displayHtml += `
            <div class="saved-bet-set" style="border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                <h3>
                    点数: ${savedSet.bets.length}, 合成オッズ: ${combinedOdds}倍
                </h3>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr><th>選択</th><th>種類</th><th>出目</th><th>成立確率</th><th>必要オッズ</th></tr>
                        </thead>
                        <tbody>
                            ${savedSet.bets.map((bet, betIndex) => `
                                <tr>
                                    <td><input type="checkbox" class="individual-bet-checkbox" data-set-id="${savedSet.id}" data-bet-index="${betIndex}"></td>
                                    <td>${getBetTypeName(bet.type)}</td>
                                    <td>${bet.pattern}</td>
                                    <td>${(bet.prob * 100).toFixed(1)}%</td>
                                    <td>${bet.odds}倍</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    savedBetsDiv.innerHTML = displayHtml;

    // 買い目がある場合は個別削除ボタンとテキスト出力ボタンを表示
    deleteIndividualBetsButton.style.display = 'block';
    exportTextButton.style.display = 'block';
}

/**
 * 選択された個別の買い目をメモリから削除します。
 */
async function deleteSelectedIndividualBets() {
    const checkboxes = document.querySelectorAll('.individual-bet-checkbox:checked');
    if (checkboxes.length === 0) {
        showMessageModal('削除する買い目を選択してください。', true);
        return;
    }

    // 削除対象の買い目をセットIDごとにグループ化し、インデックスを降順にソート
    const betsToDeleteBySetId = new Map(); // Map<setId, Array<betIndex>>
    checkboxes.forEach(checkbox => {
        const setId = checkbox.dataset.setId;
        const betIndex = parseInt(checkbox.dataset.betIndex);
        if (!betsToDeleteBySetId.has(setId)) {
            betsToDeleteBySetId.set(setId, []);
        }
        betsToDeleteBySetId.get(setId).push(betIndex);
    });

    let deletedCount = 0;

    // savedBetsを逆順に処理して、セット削除によるインデックスずれを防ぐ
    for (let i = savedBets.length - 1; i >= 0; i--) {
        const currentSet = savedBets[i];
        if (betsToDeleteBySetId.has(currentSet.id)) {
            const indicesToDelete = betsToDeleteBySetId.get(currentSet.id).sort((a, b) => b - a); // 降順ソート

            indicesToDelete.forEach(idx => {
                if (idx >= 0 && idx < currentSet.bets.length) {
                    currentSet.bets.splice(idx, 1);
                    deletedCount++;
                }
            });

            // 買い目セットが空になった場合、そのセット自体を削除
            if (currentSet.bets.length === 0) {
                savedBets.splice(i, 1);
            }
        }
    }

    if (deletedCount > 0) {
        // showMessageModal("選択された買い目を削除しました。", false); // ポップアップを削除
    } else {
        // showMessageModal("削除する買い目が見つかりませんでした。", true); // ポップアップを削除
    }

    updateSavedBetsDisplay(); // 表示を更新

    // 保存された買い目がなくなった場合、出走数と目標回収率の入力を再度有効にする
    if (savedBets.length === 0) {
        document.getElementById('carCount').disabled = false;
        document.getElementById('targetRecovery').disabled = false;
    }
}


/**
 * フォームの全ての入力と保存された買い目をリセットします。
 */
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
    savedBets = []; // 保存された買い目をクリア
    probabilities = { win: {}, place: {}, show: {} };
    updateSavedBetsDisplay();
    closeModal();
    document.getElementById('deleteIndividualBetsButton').style.display = 'none'; // リセット時にボタンを非表示
    document.getElementById('exportTextButton').style.display = 'none'; // リセット時にボタンを非表示

    // 1着候補と2着候補のドロップダウンを無効化
    firstSelect.disabled = true;
    secondSelect.disabled = true;
}

/**
 * 買い目の種類名を取得します。
 * @param {string} type - 買い目のタイプ ('exacta' または 'trifecta')
 * @returns {string} - 買い目の日本語名
 */
function getBetTypeName(type) {
    const names = { exacta: '二連単', trifecta: '三連単' };
    return names[type];
}

/**
 * メッセージモーダルを表示します。
 * @param {string} message - 表示するメッセージ
 * @param {boolean} isError - エラーメッセージかどうか (true: エラー, false: 情報)
 */
function showMessageModal(message, isError = true) {
    const modal = document.getElementById('errorModal'); // errorModalを再利用
    const messageElement = document.getElementById('errorMessage');
    messageElement.textContent = message;
    messageElement.classList.remove('error-message', 'info-message'); // 既存クラスをリセット
    messageElement.classList.add(isError ? 'error-message' : 'info-info'); // 新しいクラスを追加
    modal.style.display = 'block';
}

/**
 * エラーモーダル（メッセージモーダル）を閉じます。
 */
function closeModal() {
    document.getElementById('errorModal').style.display = 'none';
}

/**
 * マニュアルモーダルを表示します。
 */
function showManualModal() {
    document.getElementById('manualOverlay').style.display = 'block';
    document.getElementById('manualModal').style.display = 'block';
}

/**
 * マニュアルモーダルを閉じます。
 */
function closeManualModal() {
    document.getElementById('manualOverlay').style.display = 'none';
    document.getElementById('manualModal').style.display = 'none';
}

/**
 * 保存された買い目データをテキスト形式でクリップボードにコピーします。
 */
function exportBetsAsText() {
    if (savedBets.length === 0) {
        showMessageModal('出力する買い目がありません。', true);
        return;
    }

    let exportText = "--- 必要オッズ計算結果 ---\n\n";

    // 全体の合成オッズ情報を追加
    let overallTotalOddsSum = 0;
    let overallTotalBetsCount = 0;
    savedBets.forEach(savedSet => {
        savedSet.bets.forEach(bet => {
            overallTotalOddsSum += 1 / bet.odds;
            overallTotalBetsCount++;
        });
    });
    const overallCombinedOdds = overallTotalOddsSum > 0 ? Math.round((1 / overallTotalOddsSum) * 100) / 100 : 1000;
    exportText += `全体の点数: ${overallTotalBetsCount}点, 全体の合成オッズ: ${overallCombinedOdds}倍\n\n`;

    // 各買い目セットの詳細を追加
    savedBets.forEach((savedSet, setIndex) => {
        let totalOddsSum = 0;
        savedSet.bets.forEach(bet => {
            totalOddsSum += 1 / bet.odds;
        });
        const combinedOdds = totalOddsSum > 0 ? Math.round((1 / totalOddsSum) * 100) / 100 : 1000;

        exportText += `--- 買い目セット ${setIndex + 1} ---\n`;
        exportText += `点数: ${savedSet.bets.length}, 合成オッズ: ${combinedOdds}倍\n`;
        exportText += `種類 | 出目 | 成立確率 | 必要オッズ\n`;
        exportText += `---------------------------------\n`;
        savedSet.bets.forEach(bet => {
            // ユーザーの要望に合わせてパディングを調整
            const betType = getBetTypeName(bet.type);
            const probFormatted = `${(bet.prob * 100).toFixed(1)} %`;
            const oddsFormatted = `${bet.odds}倍`;
            exportText += `${betType.padEnd(8)} | ${bet.pattern.padEnd(8)} | ${probFormatted.padEnd(10)} | ${oddsFormatted}\n`;
        });
        exportText += "\n";
    });

    // クリップボードにコピー
    const textarea = document.createElement('textarea');
    textarea.value = exportText;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showMessageModal('買い目データをクリップボードにコピーしました！', false);
    } catch (err) {
        showMessageModal('クリップボードへのコピーに失敗しました。手動でコピーしてください。', true);
        console.error('クリップボードへのコピーに失敗:', err);
    }
    document.body.removeChild(textarea);
}
