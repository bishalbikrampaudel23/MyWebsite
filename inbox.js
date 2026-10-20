(function () {
  var loginSection = document.getElementById('login-section');
  var inboxSection = document.getElementById('inbox-section');
  var loginForm = document.getElementById('login-form');
  var loginStatus = document.getElementById('login-status');
  var inboxStatus = document.getElementById('inbox-status');
  var inboxList = document.getElementById('inbox-list');
  var logoutButton = document.getElementById('logout-button');
  var olderButton = document.getElementById('older-button');
  var queries = [];
  var oldestId = null;

  function api(path, options) {
    return fetch('/api' + path, Object.assign({
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    }, options)).then(async function (response) {
      var result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'The request could not be completed.');
      }
      return result;
    });
  }

  function showInbox() {
    loginSection.classList.add('inbox-hidden');
    inboxSection.classList.remove('inbox-hidden');
    loadQueries(null, false);
  }

  function showLogin() {
    inboxSection.classList.add('inbox-hidden');
    loginSection.classList.remove('inbox-hidden');
  }

  function addText(parent, tag, text, className) {
    var element = document.createElement(tag);
    element.textContent = text;
    if (className) {
      element.className = className;
    }
    parent.appendChild(element);
    return element;
  }

  function addButton(parent, label, className, callback) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', callback);
    parent.appendChild(button);
    return button;
  }

  function renderQuery(query) {
    var article = document.createElement('article');
    article.className = 'inbox-query';
    article.dataset.queryId = query.id;

    var header = document.createElement('header');
    var heading = document.createElement('div');
    addText(heading, 'h3', query.subject);
    addText(heading, 'p', query.name + ' · ' + query.email);
    addText(heading, 'p', new Date(query.created_at).toLocaleString());
    header.appendChild(heading);
    addText(header, 'span', query.status, 'query-badge');
    article.appendChild(header);
    addText(article, 'p', query.message, 'query-body');

    if (query.replies.length) {
      var history = document.createElement('div');
      history.className = 'reply-history';
      query.replies.forEach(function (reply) {
        var entry = document.createElement('div');
        entry.className = 'reply-entry';
        addText(entry, 'time', 'Reply sent ' + new Date(reply.created_at).toLocaleString());
        addText(entry, 'p', reply.message);
        if (reply.status !== 'sent') {
          addText(entry, 'p', 'Email status: ' + reply.status);
        }
        history.appendChild(entry);
      });
      article.appendChild(history);
    }

    var actions = document.createElement('div');
    actions.className = 'query-actions';
    if (query.status === 'new') {
      addButton(actions, 'Mark as read', 'query-action secondary', function () {
        api('/admin/queries/' + query.id + '/read', { method: 'POST', body: '{}' })
          .then(function () {
            query.status = 'read';
            renderQueries();
          })
          .catch(function (error) { inboxStatus.textContent = error.message; });
      });
    }
    article.appendChild(actions);

    var replyForm = document.createElement('form');
    replyForm.className = 'reply-form';
    var label = document.createElement('label');
    label.textContent = 'Reply to ' + query.email;
    var textarea = document.createElement('textarea');
    textarea.name = 'reply';
    textarea.rows = 4;
    textarea.maxLength = 4000;
    textarea.required = true;
    label.appendChild(textarea);
    replyForm.appendChild(label);
    var send = document.createElement('button');
    send.type = 'submit';
    send.textContent = 'Send reply by email';
    replyForm.appendChild(send);
    var formStatus = document.createElement('p');
    formStatus.className = 'inbox-status';
    formStatus.setAttribute('role', 'status');
    replyForm.appendChild(formStatus);
    replyForm.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!textarea.value.trim()) {
        textarea.focus();
        return;
      }
      send.disabled = true;
      formStatus.textContent = 'Sending reply…';
      api('/admin/queries/' + query.id + '/replies', {
        method: 'POST',
        body: JSON.stringify({ message: textarea.value.trim() })
      }).then(function () {
        query.status = 'replied';
        query.replies.push({
          message: textarea.value.trim(),
          status: 'sent',
          created_at: new Date().toISOString()
        });
        renderQueries();
      }).catch(function (error) {
        formStatus.textContent = error.message;
      }).finally(function () {
        send.disabled = false;
      });
    });
    article.appendChild(replyForm);
    return article;
  }

  function renderQueries() {
    inboxList.textContent = '';
    if (!queries.length) {
      addText(inboxList, 'p', 'No queries yet.');
      return;
    }
    queries.forEach(function (query) {
      inboxList.appendChild(renderQuery(query));
    });
  }

  function loadQueries(before, append) {
    inboxStatus.textContent = 'Loading messages…';
    var path = '/admin/queries' + (before ? '?before=' + encodeURIComponent(before) : '');
    return api(path).then(function (result) {
      if (append) {
        queries = queries.concat(result.queries);
      } else {
        queries = result.queries;
      }
      if (queries.length) {
        oldestId = queries[queries.length - 1].id;
      }
      renderQueries();
      olderButton.classList.toggle('inbox-hidden', !result.hasMore);
      inboxStatus.textContent = queries.length
        ? queries.length + (queries.length === 1 ? ' message' : ' messages') + ' loaded'
        : '';
    }).catch(function (error) {
      inboxStatus.textContent = error.message;
      if (/sign in|session/i.test(error.message)) {
        showLogin();
      }
    });
  }

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var password = new FormData(loginForm).get('password');
    var button = loginForm.querySelector('button[type="submit"]');
    button.disabled = true;
    loginStatus.textContent = 'Signing in…';
    api('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: password })
    }).then(function () {
      loginForm.reset();
      loginStatus.textContent = '';
      showInbox();
    }).catch(function (error) {
      loginStatus.textContent = error.message;
    }).finally(function () {
      button.disabled = false;
    });
  });

  logoutButton.addEventListener('click', function () {
    api('/admin/logout', { method: 'POST', body: '{}' }).then(showLogin)
      .catch(function (error) { inboxStatus.textContent = error.message; });
  });

  olderButton.addEventListener('click', function () {
    if (oldestId) {
      loadQueries(oldestId, true);
    }
  });

  api('/admin/session').then(showInbox).catch(showLogin);
})();
