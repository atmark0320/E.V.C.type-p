// Firebase SDKのインポートはHTMLで行うため、ここでは削除します。
// import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
// import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
// import { getFirestore, collection, query, onSnapshot, addDoc, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let savedBets = [];
let probabilities = { win: {}, place: {}, show: {} };

// Firebase関連のグローバル変数 (HTMLで読み込まれるため、ここでは宣言のみ)
let app;
let db;
let auth;
let userId = null; // 現在のユーザーID

// ★重要: Firebaseプロジェクトの実際の構成情報をここに貼り付けてください。
// Firebaseコンソール（プロジェクト設定 -> 全般 -> マイアプリ）から取得できます。
// 例:
// const FIREBASE_API_KEY = "YOUR_API_KEY";
// const FIREBASE_AUTH_DOMAIN = "YOUR_PROJECT_ID.firebaseapp.com";
// const FIREBASE_PROJECT_ID = "YOUR_PROJECT_ID";
// const FIREBASE_STORAGE_BUCKET = "YOUR_PROJECT_ID.appspot.com";
// const FIREBASE_MESSAGING_SENDER_ID = "YOUR_MESSAGING_SENDER_ID";
// const FIREBASE_APP_ID = "YOUR_APP_ID";
// const FIREBASE_MEASUREMENT_ID = "YOUR_MEASUREMENT_ID"; // 必要であれば

// Canvas環境から提供されるFirebase設定とアプリID
// Canvas環境で実行されていない場合、これらの変数はundefinedになります。
const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : null;
const canvasFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;

let firebaseConfig = {};
let currentAppId = 'default-app-id'; // デフォルト値

// ★修正点: Canvas外でのデプロイ時に実際のFirebase設定を使用するロジック
// Canvas環境で実行されている場合、Canvas提供の設定を使用
if (canvasFirebaseConfig && canvasFirebaseConfig.projectId && canvasFirebaseConfig.projectId !== "dummy-project") {
    firebaseConfig = canvasFirebaseConfig;
    currentAppId = canvasAppId;
    console.log("Using Canvas-provided Firebase configuration.");
} else {
    // Canvas環境外で実行されている場合、またはダミー設定の場合
    // ここに実際のFirebaseプロジェクトの構成情報を手動で貼り付けてください。
    // 例:
    firebaseConfig = {
        apiKey: "YOUR_API_KEY", // <-- ここに実際のAPIキーを貼り付け
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com", // <-- ここに実際のAuth Domainを貼り付け
        projectId: "YOUR_PROJECT_ID", // <-- ここに実際のProject IDを貼り付け
        storageBucket: "YOUR_PROJECT_ID.appspot.com", // <-- ここに実際のStorage Bucketを貼り付け
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // <-- ここに実際のMessaging Sender IDを貼り付け
        appId: "YOUR_APP_ID" // <-- ここに実際のApp IDを貼り付け
        // measurementId: "YOUR_MEASUREMENT_ID" // 必要であれば
    };
    currentAppId = firebaseConfig.projectId || 'default-app-id'; // Project IDをappIdとして使用
    console.warn("No Canvas-provided real Firebase configuration. Please ensure you have pasted your actual Firebase project config in script.js for persistence to work online.");
}

// Firebaseが有効かどうかを判断するフラグ
let isFirebaseEnabled = false;
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY" && typeof firebase !== 'undefined' && typeof firebase.initializeApp === 'function') {
    isFirebaseEnabled = true;
}


// DOMContentLoaded イベントリスナー: HTMLが完全に読み込まれてから実行
document.addEventListener('DOMContentLoaded', async () => {
    // 各セレクト要素への参照を取得
    const carCountSelect = document.getElementById('carCount');
    const firstSelect = document.getElementById('firstSelect');
    const secondSelect = document.getElementById('secondSelect');

    // 初期状態で1着候補と2着候補を明示的に無効化
    firstSelect.disabled = true;
    secondSelect.disabled = true;
    console.log('DOMContentLoaded: firstSelect.disabled =', firstSelect.disabled, 'secondSelect.disabled =', secondSelect.disabled);


    // イベントリスナーを設定
    carCountSelect.addEventListener('change', generateCarInputs);
    firstSelect.addEventListener('change', updateProbabilityInputs);
    secondSelect.addEventListener('change', updateProbabilityInputs);

    // ★修正点: Firebaseが有効な場合のみ初期化と認証を試みる
    if (isFirebaseEnabled) {
        try {
            app = firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
            auth = firebase.auth();

            // 認証状態の変更を監視
            auth.onAuthStateChanged(async (user) => {
                if (user) {
                    userId = user.uid;
                    console.log("Firebase authenticated. User ID:", userId);
                    loadSavedBetsFromFirestore(); // 認証後に買い目をロード
                } else {
                    console.log("Firebase not authenticated. Signing in anonymously...");
                    try {
                        // __initial_auth_token が定義されていない場合は匿名認証を使用
                        if (typeof __initial_auth_token !== 'undefined') {
                            await auth.signInWithCustomToken(__initial_auth_token);
                        } else {
                            await auth.signInAnonymously();
                        }
                    } catch (error) {
                        console.error("Firebase authentication failed:", error);
                        showErrorModal("認証に失敗しました。アプリをリロードしてください。");
                        // 認証失敗時はDBとAuthを無効化して永続化を停止
                        db = null;
                        auth = null;
                        userId = null;
                        updateSavedBetsDisplay(); // 表示を更新
                    }
                }
            });
        } catch (initError) {
            console.error("Firebase initialization failed:", initError);
            showErrorModal("Firebaseの初期化に失敗しました。アプリをリロードしてください。");
            console.warn("Running without persistence due to Firebase initialization error.");
            db = null; // 初期化失敗時はDBとAuthを無効化
            auth = null;
            userId = null;
            updateSavedBetsDisplay(); // Firebaseなしで表示を更新
        }
    } else {
        console.warn("Firebase persistence is disabled because a real Firebase configuration was not provided or Firebase SDK is not loaded.");
        // Firebaseが利用できない場合の初期表示
        db = null; // 明示的にnullに設定
        auth = null;
        userId = null;
        updateSavedBetsDisplay();
    }
});

// Firestoreから保存された買い目をロードする関数
function loadSavedBetsFromFirestore() {
    if (!db || !userId) {
        console.warn("Firestore or User ID not available for loading bets. Persistence is disabled.");
        return;
    }

    // ユーザー固有のコレクションパス
    const userBetsCollectionRef = db.collection(`artifacts/${currentAppId}/users/${userId}/savedBets`);
    
    // リアルタイムリスナーを設定
    userBetsCollectionRef.onSnapshot((snapshot) => {
        const bets = [];
        snapshot.forEach(doc => {
            bets.push({ id: doc.id, ...doc.data() }); // ドキュメントIDも保存
        });
        savedBets = bets; // グローバル変数savedBetsを更新
        updateSavedBetsDisplay(); // 表示を更新
        console.log("Saved bets loaded from Firestore:", savedBets);

        // 買い目がない場合、出走数と目標回収率の入力を再度有効にする
        if (savedBets.length === 0) {
            document.getElementById('carCount').disabled = false;
            document.getElementById('targetRecovery').disabled = false;
        } else {
            document.getElementById('carCount').disabled = true;
            document.getElementById('targetRecovery').disabled = true;
        }
    }, (error) => {
        console.error("Error fetching saved bets from Firestore:", error);
        showErrorModal("保存された買い目の読み込み中にエラーが発生しました。");
    });
}


// 出走数に基づいて入力フィールドを生成する関数
function generateCarInputs() {
    const count = parseInt(document.getElementById('carCount').value);
    const firstSelect = document.getElementById('firstSelect');
    const secondSelect = document.getElementById('secondSelect');
    
    // 選択肢をクリア
    firstSelect.innerHTML = '<option value="">選択してください</option>';
    secondSelect.innerHTML = '<option value="">選択してください</option>';
    document.getElementById('probabilityInputs').innerHTML = '';
    document.getElementById('results').innerHTML = '';
    
    if (!count) { // 出走数が選択されていない場合
        document.getElementById('calcButton').disabled = true;
        document.getElementById('saveButton').disabled = true;
        // 出走数が選択されていない場合、1着候補と2着候補を無効化
        firstSelect.disabled = true;
        secondSelect.disabled = true;
        console.log('generateCarInputs: count is empty. firstSelect.disabled =', firstSelect.disabled, 'secondSelect.disabled =', secondSelect.disabled);
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
    console.log('generateCarInputs: count selected. firstSelect.disabled =', firstSelect.disabled);
    updateProbabilityInputs(); // 確率入力フィールドを更新
}

// 確率入力フィールドを更新する関数
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
            if (i !== firstSelected) {
                const option2 = document.createElement('option');
                option2.value = i;
                option2.text = `${i}番`;
                secondSelect.appendChild(option2);
            }
        }
        // 1着候補が選択されたら2着候補を有効化
        secondSelect.disabled = false;
        console.log('updateProbabilityInputs: firstSelected. secondSelect.disabled =', secondSelect.disabled);
    } else {
        // 1着候補が選択されていない場合は2着候補を無効化
        secondSelect.disabled = true;
        console.log('updateProbabilityInputs: no firstSelected. secondSelect.disabled =', secondSelect.disabled);
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

// 各確率の合計値を更新する関数
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
        showErrorModal('合計確率が100%を超えています。調整してください。');
    } else {
        closeModal(); // エラーが解消されたらモーダルを閉じる
    }
}

// 残りの確率を均等に割り振る関数
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

// オッズを計算する関数
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
        showErrorModal('未入力の項目があります。すべての有効な欄に入力してください。');
        document.getElementById('saveButton').disabled = true;
        return;
    }

    const tolerance = 0.01;
    // 確率の合計が100%でない場合、エラーモーダルを表示
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

// 選択された買い目を保存する関数
async function saveSelectedBets() {
    const checkboxes = document.querySelectorAll('.bet-checkbox:checked');
    if (checkboxes.length === 0) {
        showErrorModal('保存する買い目を選択してください。');
        return;
    }
    
    const betName = prompt("この買い目セットに名前を付けてください:");
    if (betName === null || betName.trim() === "") {
        showErrorModal("買い目には名前が必要です。");
        return;
    }

    if (!db || !userId) {
        showErrorModal("Firebaseが利用できません。買い目は保存されません。");
        return; // Firebaseが利用できない場合はここで処理を中断
    }

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

    try {
        await db.collection(`artifacts/${currentAppId}/users/${userId}/savedBets`).add({
            name: betName,
            bets: newBets,
            timestamp: new Date()
        });
        console.log("Bets saved to Firestore.");
    } catch (e) {
        console.error("Error adding document: ", e);
        showErrorModal("買い目の保存中にエラーが発生しました。");
    }

    document.getElementById('results').innerHTML = '';
    document.getElementById('saveButton').disabled = true;

    document.getElementById('carCount').disabled = true;
    document.getElementById('targetRecovery').disabled = true;
}

// 保存された買い目を表示する関数
function updateSavedBetsDisplay() {
    const savedBetsDiv = document.getElementById('savedBets');
    const deleteButton = document.getElementById('deleteSavedBetsButton');

    if (savedBets.length === 0) {
        savedBetsDiv.innerHTML = '<p>保存された買い目はまだありません。</p>';
        deleteButton.style.display = 'none';
        return;
    }

    let displayHtml = '';
    savedBets.forEach((savedSet, setIndex) => {
        let totalOddsSum = 0;
        savedSet.bets.forEach(bet => {
            totalOddsSum += 1 / bet.odds;
        });
        const combinedOdds = totalOddsSum > 0 ? Math.round((1 / totalOddsSum) * 100) / 100 : 1000;

        displayHtml += `
            <div class="saved-bet-set" style="border: 1px solid #eee; padding: 10px; margin-bottom: 10px; border-radius: 5px;">
                <h3>
                    <input type="checkbox" class="saved-bet-checkbox" data-doc-id="${savedSet.id}" id="checkbox-${savedSet.id}">
                    <label for="checkbox-${savedSet.id}">${savedSet.name} (買い目数: ${savedSet.bets.length}, 合成オッズ: ${combinedOdds}倍)</label>
                </h3>
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr><th>種類</th><th>出目</th><th>成立確率</th><th>必要オッズ</th></tr>
                        </thead>
                        <tbody>
                            ${savedSet.bets.map(bet => `
                                <tr>
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

    deleteButton.style.display = 'block';
}

// 選択された買い目を削除する関数
async function deleteSelectedBets() {
    const checkboxes = document.querySelectorAll('.saved-bet-checkbox:checked');
    if (checkboxes.length === 0) {
        showErrorModal('削除する買い目を選択してください。');
        return;
    }

    if (!db || !userId) {
        showErrorModal("データベースが利用できません。");
        return; // Firebaseが利用できない場合はここで処理を中断
    }

    const docIdsToDelete = Array.from(checkboxes).map(cb => cb.dataset.docId);

    try {
        for (const docId of docIdsToDelete) {
            await db.collection(`artifacts/${currentAppId}/users/${userId}/savedBets`).doc(docId).delete();
        }
        console.log("Selected bets deleted from Firestore.");
    } catch (e) {
        console.error("Error deleting documents: ", e);
        showErrorModal("買い目の削除中にエラーが発生しました。");
    }
}

// フォームをリセットする関数
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
    // savedBets = []; // Firestoreからロードするため、この行は不要
    probabilities = { win: {}, place: {}, show: {} };
    updateSavedBetsDisplay();
    closeModal();
    document.getElementById('deleteSavedBetsButton').style.display = 'none'; // リセット時に削除ボタンを非表示

    // 1着候補と2着候補のドロップダウンを無効化
    firstSelect.disabled = true;
    secondSelect.disabled = true;
}

// 買い目の種類名を取得する関数
function getBetTypeName(type) {
    const names = { exacta: '二連単', trifecta: '三連単' };
    return names[type];
}

// エラーモーダルを表示する関数
function showErrorModal(message) {
    document.getElementById('errorMessage').textContent = message;
    document.getElementById('errorModal').style.display = 'block';
}

// エラーモーダルを閉じる関数
function closeModal() {
    document.getElementById('errorModal').style.display = 'none';
}

// マニュアルモーダルを表示する関数
function showManualModal() {
    document.getElementById('manualOverlay').style.display = 'block';
    document.getElementById('manualModal').style.display = 'block';
}

// マニュアルモーダルを閉じる関数
function closeManualModal() {
    document.getElementById('manualOverlay').style.display = 'none';
    document.getElementById('manualModal').style.display = 'none';
}
