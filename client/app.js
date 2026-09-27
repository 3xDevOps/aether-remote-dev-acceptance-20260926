import { heading } from './welcome.js';

const $ = id => document.getElementById(id);
$('welcome-heading').textContent = heading;

// Accept only this dependency: do not re-run login setup or replace form state.
if (import.meta.hot) {
  import.meta.hot.accept('./welcome.js', updated => {
    if (updated) $('welcome-heading').textContent = updated.heading;
  });
}

async function api(url, data) {
  const response = await fetch(url, data === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw Object.assign(new Error(result.error), { status: response.status });
  return result;
}

function showLogin() {
  $('login-panel').hidden = false;
  $('workspace-panel').hidden = true;
  $('note').value = '';
  $('saved-note').textContent = '';
  $('note-status').textContent = '';
  $('workspace-error').textContent = '';
}

function showWorkspace(data) {
  $('login-panel').hidden = true;
  $('workspace-panel').hidden = false;
  $('account').textContent = data.email;
  $('note').value = data.note;
  $('saved-note').textContent = data.note;
  $('saved').hidden = !data.note;
  $('password').value = '';
}

$('login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  $('login-error').textContent = '';
  try {
    showWorkspace(await api('/api/login', { email: $('email').value, password: $('password').value }));
    $('note').focus();
  } catch (error) { $('login-error').textContent = error.message; }
  finally { button.disabled = false; }
});

$('note-form').addEventListener('submit', async event => {
  event.preventDefault();
  event.submitter.disabled = true;
  $('note-status').textContent = 'Saving…';
  $('workspace-error').textContent = '';
  try {
    const data = await api('/api/note', { note: $('note').value });
    $('saved-note').textContent = data.note || '(Empty note)';
    $('saved').hidden = false;
    $('note-status').textContent = 'Saved just now.';
  } catch (error) {
    $('note-status').textContent = '';
    $('workspace-error').textContent = error.message;
    if (error.status === 401) showLogin();
  } finally { event.submitter.disabled = false; }
});

$('logout').addEventListener('click', async () => {
  try { await api('/api/logout', {}); showLogin(); $('email').focus(); }
  catch (error) { $('workspace-error').textContent = error.message; }
});

api('/api/session').then(showWorkspace).catch(error => {
  if (error.status !== 401) $('login-error').textContent = error.message;
});
