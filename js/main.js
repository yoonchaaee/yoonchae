const STORAGE_KEY = 'subtracker-subscriptions';
const form = document.querySelector('#subscription-form');
const feedback = document.querySelector('#form-feedback');
const submitButton = document.querySelector('#submit-button');
const cancelEditButton = document.querySelector('#cancel-edit-button');
let subscriptions = loadSubscriptions();
let editingId = null;

function loadSubscriptions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidSubscription) : [];
  } catch (error) {
    console.warn('저장된 구독 데이터를 불러오지 못했습니다.', error);
    return [];
  }
}

function isValidSubscription(subscription) {
  return subscription && typeof subscription.id === 'string'
    && typeof subscription.name === 'string'
    && Number.isFinite(Number(subscription.amount))
    && ['monthly', 'yearly'].includes(subscription.cycle)
    && typeof subscription.nextPaymentDate === 'string'
    && typeof subscription.category === 'string'
    && typeof subscription.paymentMethod === 'string';
}

function saveSubscriptions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    return true;
  } catch (error) {
    console.error('구독 데이터를 저장하지 못했습니다.', error);
    feedback.textContent = '저장 공간에 문제가 있어 변경 사항을 저장하지 못했어요.';
    return false;
  }
}

function refresh() {
  renderApp(subscriptions);
}

function resetForm() {
  form.reset();
  editingId = null;
  document.querySelector('#form-title').textContent = '새 구독 추가';
  submitButton.innerHTML = '구독 저장 <span aria-hidden="true">→</span>';
  cancelEditButton.classList.add('hidden');
  feedback.textContent = '';
}

function beginEdit(subscription) {
  editingId = subscription.id;
  form.elements.name.value = subscription.name;
  form.elements.amount.value = subscription.amount;
  form.elements.cycle.value = subscription.cycle;
  form.elements.nextPaymentDate.value = subscription.nextPaymentDate;
  form.elements.category.value = subscription.category;
  form.elements.paymentMethod.value = subscription.paymentMethod;
  document.querySelector('#form-title').textContent = '구독 수정';
  submitButton.innerHTML = '변경 내용 저장 <span aria-hidden="true">→</span>';
  cancelEditButton.classList.remove('hidden');
  feedback.textContent = '';
  document.querySelector('#form-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
  form.elements.name.focus({ preventScroll: true });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const amount = Number(data.get('amount'));
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    feedback.textContent = '결제 금액은 1원 이상의 정수로 입력해주세요.';
    return;
  }

  const existing = subscriptions.find((item) => item.id === editingId);
  const subscription = {
    id: existing?.id || (globalThis.crypto?.randomUUID?.() || `sub_${Date.now()}_${Math.random().toString(16).slice(2)}`),
    name: String(data.get('name')).trim(),
    amount,
    cycle: String(data.get('cycle')),
    nextPaymentDate: String(data.get('nextPaymentDate')),
    category: String(data.get('category')).trim(),
    paymentMethod: String(data.get('paymentMethod')).trim()
  };

  if (!subscription.name || !subscription.category || !subscription.paymentMethod || !subscription.nextPaymentDate) {
    feedback.textContent = '모든 항목을 입력해주세요.';
    return;
  }

  if (editingId) {
    subscriptions = subscriptions.map((item) => item.id === editingId ? subscription : item);
  } else {
    subscriptions = [...subscriptions, subscription];
  }

  if (!saveSubscriptions()) return;
  refresh();
  resetForm();
});

document.querySelector('#subscription-list').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const subscription = subscriptions.find((item) => item.id === button.dataset.id);
  if (!subscription) return;

  if (button.dataset.action === 'edit') {
    beginEdit(subscription);
    return;
  }

  if (button.dataset.action === 'delete' && window.confirm(`'${subscription.name}' 구독을 삭제할까요?`)) {
    subscriptions = subscriptions.filter((item) => item.id !== subscription.id);
    if (editingId === subscription.id) resetForm();
    if (saveSubscriptions()) refresh();
  }
});

cancelEditButton.addEventListener('click', resetForm);
document.querySelector('#focus-name-button').addEventListener('click', () => {
  document.querySelector('#form-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
  form.elements.name.focus({ preventScroll: true });
});

refresh();