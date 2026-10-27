(function () {
  var form = document.getElementById('query-form');
  if (!form) {
    return;
  }

  var status = document.getElementById('query-status');
  var turnstileStatus = document.getElementById('turnstile-status');
  var turnstileContainer = document.getElementById('turnstile-widget');
  var submitButton = form.querySelector('button[type="submit"]');
  var statusKey = '';
  var turnstileId = null;
  var turnstileToken = '';
  var submitting = false;

  function translate(key, english) {
    return window.portfolioTranslate
      ? window.portfolioTranslate(key, english)
      : english;
  }

  function setStatus(key, english) {
    statusKey = key;
    status.textContent = translate(key, english);
  }

  function resetTurnstile() {
    turnstileToken = '';
    submitButton.disabled = true;
    if (window.turnstile && turnstileId !== null) {
      window.turnstile.reset(turnstileId);
    }
  }

  function loadTurnstile() {
    turnstileStatus.textContent = translate(
      'query.turnstileLoading',
      'Loading anti-spam check…'
    );
    fetch('/api/config', { headers: { Accept: 'application/json' } })
      .then(async function (response) {
        var result = await response.json();
        if (!response.ok || !result.turnstileSiteKey) {
          throw new Error(result.error || 'Anti-spam verification is not configured.');
        }
        return result.turnstileSiteKey;
      })
      .then(function (siteKey) {
        var script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        script.onload = function () {
          turnstileId = window.turnstile.render(turnstileContainer, {
            sitekey: siteKey,
            action: 'visitor_query',
            callback: function (token) {
              turnstileToken = token;
              submitButton.disabled = false;
              turnstileStatus.textContent = translate(
                'query.turnstileComplete',
                'Anti-spam check complete.'
              );
            },
            'expired-callback': function () {
              resetTurnstile();
              turnstileStatus.textContent = translate(
                'query.turnstileExpired',
                'Anti-spam check expired. Please complete it again.'
              );
            },
            'error-callback': function () {
              turnstileToken = '';
              submitButton.disabled = true;
              turnstileStatus.textContent = translate(
                'query.turnstileError',
                'Anti-spam check failed to load. Please refresh the page.'
              );
            }
          });
        };
        script.onerror = function () {
          turnstileStatus.textContent = translate(
            'query.turnstileError',
            'Anti-spam check failed to load. Please refresh the page.'
          );
        };
        document.head.appendChild(script);
      })
      .catch(function () {
        turnstileStatus.textContent = translate(
          'query.turnstileError',
          'Anti-spam check is unavailable. Please try again later.'
        );
      });
  }

  window.addEventListener('portfolio:language-change', function () {
    if (!turnstileToken && turnstileId === null) {
      turnstileStatus.textContent = translate(
        'query.turnstileLoading',
        'Loading anti-spam check…'
      );
    } else if (turnstileToken) {
      turnstileStatus.textContent = translate(
        'query.turnstileComplete',
        'Anti-spam check complete.'
      );
    }
    if (statusKey) {
      var messages = {
        'query.sending': 'Sending your private query…',
        'query.saved': 'Your query has been sent privately. Thank you — I’ll reply to your email.',
        'query.savedNoAlert': 'Your query was saved, but the inbox email alert could not be sent. Please use the contact details below if your message is urgent.',
        'query.rateLimited': 'Too many messages. Please try again later.',
        'query.failed': 'Your query could not be sent. Please try again.'
      };
      setStatus(statusKey, messages[statusKey]);
    }
  });

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (submitting) {
      return;
    }
    if (!form.reportValidity()) {
      return;
    }
    if (!turnstileToken) {
      turnstileStatus.textContent = translate(
        'query.turnstileExpired',
        'Please complete the anti-spam check before sending.'
      );
      return;
    }

    var values = new FormData(form);
    submitting = true;
    submitButton.disabled = true;
    setStatus('query.sending', 'Sending your private query…');

    try {
      var response = await fetch('/api/queries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.get('name'),
          email: values.get('email'),
          subject: values.get('subject'),
          message: values.get('message'),
          website: values.get('website'),
          turnstileToken: turnstileToken
        })
      });
      var result = await response.json();
      if (response.status === 429) {
        setStatus(
          'query.rateLimited',
          result.error || 'Too many messages. Please try again later.'
        );
        return;
      }
      if (!response.ok) {
        throw new Error(result.error || 'Your query could not be sent. Please try again.');
      }

      form.reset();
      setStatus(
        result.notificationSent === false ? 'query.savedNoAlert' : 'query.saved',
        result.notificationSent === false
          ? 'Your query was saved, but the inbox email alert could not be sent. Please use the contact details below if your message is urgent.'
          : 'Your query has been sent privately. Thank you — I’ll reply to your email.'
      );
    } catch (error) {
      statusKey = 'query.failed';
      status.textContent = error.message || window.portfolioTranslate('query.failed', 'Your query could not be sent. Please try again.');
    } finally {
      resetTurnstile();
      submitting = false;
    }
  });

  loadTurnstile();
})();
