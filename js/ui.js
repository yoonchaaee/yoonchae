const subscriptionColors = [
  { background: '#e3eee6', color: '#28674d' },
  { background: '#fae8df', color: '#bf6046' },
  { background: '#e6edf2', color: '#537f96' },
  { background: '#f5eed8', color: '#9c7626' }
];

function formatWon(amount) {
  return `${Number(amount || 0).toLocaleString('ko-KR')}원`;
}

function getTodayString() {
  const now = new Date();
  const localYear = now.getFullYear();
  const localMonth = String(now.getMonth() + 1).padStart(2, '0');
  const localDay = String(now.getDate()).padStart(2, '0');
  return `${localYear}-${localMonth}-${localDay}`;
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

function renderSummary(subscriptions) {
  const monthlyTotal = getTotalMonthlyAmount(subscriptions);
  const upcoming = getUpcomingPayments(subscriptions, 7);
  const upcomingTotal = upcoming.reduce((total, item) => total + getMonthlyAmount(item), 0);

  document.querySelector('#monthly-total').textContent = formatWon(monthlyTotal);
  document.querySelector('#yearly-total').textContent = formatWon(getTotalYearlyAmount(subscriptions));
  document.querySelector('#upcoming-count').textContent = `${upcoming.length}건`;
  document.querySelector('#upcoming-caption').textContent = upcoming.length
    ? `${formatWon(upcomingTotal)} 월 환산 금액`
    : '앞으로 7일 이내';
  document.querySelector('#subscription-count').textContent = subscriptions.length;
}

function renderSubscriptions(subscriptions) {
  const list = document.querySelector('#subscription-list');
  list.replaceChildren();

  if (subscriptions.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = '<span class="empty-mark" aria-hidden="true">＋</span><strong>아직 등록된 구독이 없어요</strong><p>오른쪽에서 첫 구독을 추가해보세요.</p>';
    list.append(empty);
    return;
  }

  const today = getTodayString();
  subscriptions.forEach((subscription, index) => {
    const card = document.createElement('article');
    card.className = 'subscription-card';
    const color = subscriptionColors[index % subscriptionColors.length];
    const daysLeft = getDaysUntilNextPayment(today, subscription.nextPaymentDate);
    const dayLabel = daysLeft < 0 ? '결제일 지남' : daysLeft === 0 ? '오늘 결제' : `D-${daysLeft}`;
    const cycleLabel = subscription.cycle === 'yearly' ? '연간 결제' : '월간 결제';

    const main = document.createElement('div');
    main.className = 'service-main';
    const avatar = document.createElement('span');
    avatar.className = 'service-avatar';
    avatar.style.setProperty('--avatar-bg', color.background);
    avatar.style.setProperty('--avatar-color', color.color);
    avatar.textContent = subscription.name.trim().charAt(0).toUpperCase();
    avatar.setAttribute('aria-hidden', 'true');
    const details = document.createElement('div');
    details.className = 'service-details';
    const name = document.createElement('p');
    name.className = 'service-name';
    name.textContent = subscription.name;
    const meta = document.createElement('div');
    meta.className = 'service-meta';
    const category = document.createElement('span');
    category.textContent = subscription.category;
    const cycle = document.createElement('span');
    cycle.textContent = cycleLabel;
    const paymentMethod = document.createElement('span');
    paymentMethod.textContent = subscription.paymentMethod;
    meta.append(category, cycle, paymentMethod);
    details.append(name, meta);
    main.append(avatar, details);

    const price = document.createElement('div');
    price.className = 'service-price';
    const amount = document.createElement('strong');
    amount.textContent = formatWon(getMonthlyAmount(subscription));
    const amountLabel = document.createElement('span');
    amountLabel.textContent = subscription.cycle === 'yearly'
      ? `${formatWon(subscription.amount)} / 년`
      : '/ 월';
    price.append(amount, amountLabel);

    const paymentDay = document.createElement('div');
    paymentDay.className = 'payment-day';
    paymentDay.textContent = dayLabel;
    const paymentDate = document.createElement('small');
    paymentDate.textContent = formatDate(subscription.nextPaymentDate);
    paymentDay.append(paymentDate);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'text-action';
    editButton.dataset.action = 'edit';
    editButton.dataset.id = subscription.id;
    editButton.textContent = '수정';
    editButton.setAttribute('aria-label', `${subscription.name} 수정`);
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'text-action delete';
    deleteButton.dataset.action = 'delete';
    deleteButton.dataset.id = subscription.id;
    deleteButton.textContent = '삭제';
    deleteButton.setAttribute('aria-label', `${subscription.name} 삭제`);
    actions.append(editButton, deleteButton);

    card.append(main, price, paymentDay, actions);
    list.append(card);
  });
}

function renderCategories(subscriptions) {
  const list = document.querySelector('#category-list');
  list.replaceChildren();
  const totals = getMonthlyAmountByCategory(subscriptions);
  const entries = Object.entries(totals).sort((first, second) => second[1] - first[1]);
  const total = entries.reduce((sum, [, amount]) => sum + amount, 0);

  if (!entries.length || total === 0) {
    const empty = document.createElement('p');
    empty.className = 'category-empty';
    empty.textContent = '구독을 추가하면 비중이 표시돼요.';
    list.append(empty);
    return;
  }

  entries.forEach(([category, amount], index) => {
    const percentage = Math.round(amount / total * 100);
    const row = document.createElement('div');
    row.className = 'category-row';
    const name = document.createElement('span');
    name.className = 'category-name';
    name.textContent = category;
    const track = document.createElement('div');
    track.className = 'category-track';
    track.setAttribute('role', 'meter');
    track.setAttribute('aria-label', `${category} 비중`);
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', '100');
    track.setAttribute('aria-valuenow', String(percentage));
    const fill = document.createElement('div');
    fill.className = 'category-fill';
    fill.style.width = `${percentage}%`;
    fill.style.setProperty('--bar-color', ['#28674d', '#d96d52', '#648ba0', '#d2a73d'][index % 4]);
    track.append(fill);
    const value = document.createElement('span');
    value.className = 'category-percent';
    value.textContent = `${percentage}%`;
    row.append(name, track, value);
    list.append(row);
  });
}

function renderApp(subscriptions) {
  renderSummary(subscriptions);
  renderSubscriptions(subscriptions);
  renderCategories(subscriptions);
  document.querySelector('#today-label').textContent = formatDate(getTodayString());
}