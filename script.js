let savedBets = [];
let probabilities = { win: {}, place: {}, show: {} };
let passwordAttempts = 0;
const correctPassword = "Ptool"; // パスワード設定

// ページ読み込み時の処理
document.addEventListener("DOMContentLoaded", () => {
    // index.htmlの場合のみパスワードモーダルを表示
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
        // パスワードが正しい場合、main.htmlに遷移
        window.location.href = "https://atmark0320.github.io/E.V.C.type-p/main.html";
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
if (document.getElementById("passwordInput")) {
    document.getElementById("passwordInput").addEventListener("keypress", function(event) {
        if (event.key === "Enter") {
            checkPassword();
        }
    });
}

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

// その他の関数（updateProbabilityInputs, updateSums, fillRemaining, calculateOdds, saveSelectedBets, updateSavedBetsDisplay, resetForm, getBetTypeName, showErrorModal, closeModal, showManualModal, closeManualModal）は変更なし
function updateProbabilityInputs() { /* 既存の内容 */ }
function updateSums() { /* 既存の内容 */ }
function fillRemaining(type) { /* 既存の内容 */ }
function calculateOdds() { /* 既存の内容 */ }
function saveSelectedBets() { /* 既存の内容 */ }
function updateSavedBetsDisplay(combinedOdds) { /* 既存の内容 */ }
function resetForm() { /* 既存の内容 */ }
function getBetTypeName(type) { /* 既存の内容 */ }
function showErrorModal(message) { /* 既存の内容 */ }
function closeModal() { /* 既存の内容 */ }
function showManualModal() { /* 既存の内容 */ }
function closeManualModal() { /* 既存の内容 */ }
